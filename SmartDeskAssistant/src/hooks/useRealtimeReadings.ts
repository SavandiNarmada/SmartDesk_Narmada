import { useMemo } from 'react';
import { useRealtime, SensorReading } from '../context/RealtimeContext';

export type { SensorReading } from '../context/RealtimeContext';

export function useRealtimeReadings(deviceId: string | undefined) {
  const { isConnected, liveReadings, deviceStatuses, ticks, reconnect } = useRealtime();

  return useMemo(() => {
    if (!deviceId) {
      return {
        liveReading: null as SensorReading | null,
        isConnected,
        deviceStatus: null as 'online' | 'offline' | null,
        tick: 0,
        reconnect,
      };
    }

    return {
      liveReading: liveReadings[deviceId] || null,
      isConnected,
      deviceStatus: deviceStatuses[deviceId] || null,
      tick: ticks[deviceId] || 0,
      reconnect,
    };
  }, [deviceId, deviceStatuses, isConnected, liveReadings, ticks, reconnect]);
}
