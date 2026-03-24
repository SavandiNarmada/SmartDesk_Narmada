import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../services/apiClient';
import { WS_URL } from '../services/config';

export interface SensorReading {
  airQuality?: number | null;
  lightLevel?: number | null;
  noiseLevel?: number | null;
  temperature?: number | null;
  humidity?: number | null;
}

interface WSMessage {
  type: string;
  deviceId?: string;
  data?: any;
  timestamp?: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  liveReadings: Record<string, SensorReading>;
  deviceStatuses: Record<string, 'online' | 'offline'>;
  ticks: Record<string, number>;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingsRef = useRef<Record<string, SensorReading>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [liveReadings, setLiveReadings] = useState<Record<string, SensorReading>>({});
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [ticks, setTicks] = useState<Record<string, number>>({});

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    const ws = wsRef.current;
    wsRef.current = null;

    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    }

    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;

    const token = apiClient.getToken();
    if (!token) return;

    const current = wsRef.current;
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type !== 'sensor_reading' || !msg.deviceId || !msg.data) return;

        if (msg.data._statusChange) {
          const nextStatus = msg.data.status === 'online' ? 'online' : 'offline';
          setDeviceStatuses((prev) => (
            prev[msg.deviceId!] === nextStatus ? prev : { ...prev, [msg.deviceId!]: nextStatus }
          ));
          return;
        }

        const deviceId = msg.deviceId;
        const previous = readingsRef.current[deviceId] || {};
        const next: SensorReading = { ...previous };
        const data = msg.data;

        if (data.airQuality != null) next.airQuality = data.airQuality;
        if (data.lightLevel != null) next.lightLevel = data.lightLevel;
        if (data.noiseLevel != null) next.noiseLevel = data.noiseLevel;
        if (data.temperature != null) next.temperature = data.temperature;
        if (data.humidity != null) next.humidity = data.humidity;

        readingsRef.current = {
          ...readingsRef.current,
          [deviceId]: next,
        };

        setLiveReadings((prev) => ({
          ...prev,
          [deviceId]: { ...next },
        }));
        setDeviceStatuses((prev) => (
          prev[deviceId] === 'online' ? prev : { ...prev, [deviceId]: 'online' }
        ));
        setTicks((prev) => ({
          ...prev,
          [deviceId]: (prev[deviceId] || 0) + 1,
        }));
      } catch {
        // Ignore malformed websocket frames.
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      setIsConnected(false);

      if (!isAuthenticated) return;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        connect();
      }, 1500);
    };
  }, [isAuthenticated]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [connect, disconnect]);

  useEffect(() => {
    if (!isAuthenticated) {
      readingsRef.current = {};
      setLiveReadings({});
      setDeviceStatuses({});
      setTicks({});
      disconnect();
      return;
    }

    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, isAuthenticated]);

  return (
    <RealtimeContext.Provider value={{ isConnected, liveReadings, deviceStatuses, ticks, reconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
