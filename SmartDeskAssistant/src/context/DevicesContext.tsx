import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { DevicesState, Device, NewDevice, SensorReading } from '../types';
import { devicesService } from '../services/devicesService';
import { APIError } from '../services/apiClient';

interface DevicesActions {
  fetchDevices: () => Promise<void>;
  refreshSelectedDevice: () => Promise<void>;
  addDevice: (device: NewDevice) => Promise<void>;
  updateDevice: (id: string, device: Partial<Device>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  selectDevice: (device: Device) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type DevicesContextType = DevicesState & DevicesActions;

type DevicesAction = 
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_DEVICES'; devices: Device[] }
  | { type: 'ADD_DEVICE'; device: Device }
  | { type: 'UPDATE_DEVICE'; id: string; device: Partial<Device> }
  | { type: 'DELETE_DEVICE'; id: string }
  | { type: 'SELECT_DEVICE'; device: Device };

const initialState: DevicesState = {
  devices: [],
  selectedDevice: null,
  isLoading: false,
  error: null,
};

function devicesReducer(state: DevicesState, action: DevicesAction): DevicesState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };
    case 'SET_DEVICES':
      return {
        ...state,
        devices: action.devices,
        isLoading: false,
        error: null,
      };
    case 'ADD_DEVICE':
      return {
        ...state,
        devices: [...state.devices, action.device],
        isLoading: false,
        error: null,
      };
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device =>
          device.id === action.id ? { ...device, ...action.device } : device
        ),
        selectedDevice: state.selectedDevice?.id === action.id 
          ? { ...state.selectedDevice, ...action.device }
          : state.selectedDevice,
        isLoading: false,
        error: null,
      };
    case 'DELETE_DEVICE':
      return {
        ...state,
        devices: state.devices.filter(device => device.id !== action.id),
        selectedDevice: state.selectedDevice?.id === action.id ? null : state.selectedDevice,
        isLoading: false,
        error: null,
      };
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDevice: action.device,
      };
    default:
      return state;
  }
}

const DevicesContext = createContext<DevicesContextType | undefined>(undefined);

interface DevicesProviderProps {
  children: ReactNode;
}

export function DevicesProvider({ children }: DevicesProviderProps) {
  const [state, dispatch] = useReducer(devicesReducer, initialState);

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      
      // Call real API
      const response = await devicesService.getDevices();
      
      if (response.success && response.data) {
        // Map API response to frontend format
        const devices = response.data.map((device: any) => ({
          id: device.id,
          name: device.name,
          type: device.type,
          location: device.location,
          status: device.status,
          batteryLevel: device.batteryLevel || device.battery_level,
          lastReading: device.lastReading,
          wifiSettings: device.wifiSettings,
          notificationPreferences: device.notificationPreferences,
          createdAt: device.createdAt || device.created_at,
          updatedAt: device.updatedAt || device.updated_at,
        }));
        
        dispatch({ type: 'SET_DEVICES', devices });
      } else {
        throw new Error(response.error || 'Failed to fetch devices');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Failed to fetch devices. Please check your connection.';
      setError(errorMessage);
    }
  };

  const addDevice = async (device: NewDevice) => {
    try {
      setLoading(true);
      
      // Call real API
      const response = await devicesService.createDevice(device);
      
      if (response.success && response.data) {
        const newDevice: Device = {
          id: response.data.id,
          name: response.data.name,
          type: response.data.type,
          location: response.data.location,
          status: response.data.status,
          batteryLevel: (response.data as any).battery_level,
          wifiSettings: device.wifiSettings,
          notificationPreferences: device.notificationPreferences,
          createdAt: (response.data as any).created_at,
          updatedAt: (response.data as any).updated_at,
        };
        
        dispatch({ type: 'ADD_DEVICE', device: newDevice });
      } else {
        throw new Error(response.error || 'Failed to add device');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Failed to add device. Please check your connection.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateDevice = async (id: string, device: Partial<Device>) => {
    try {
      setLoading(true);
      
      // Call real API
      const response = await devicesService.updateDevice(id, device);
      
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_DEVICE', id, device: response.data });
      } else {
        throw new Error(response.error || 'Failed to update device');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Failed to update device. Please check your connection.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      setLoading(true);
      
      // Call real API
      const response = await devicesService.deleteDevice(id);
      
      if (response.success) {
        dispatch({ type: 'DELETE_DEVICE', id });
      } else {
        throw new Error(response.error || 'Failed to delete device');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Failed to delete device. Please check your connection.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const selectDevice = (device: Device) => {
    dispatch({ type: 'SELECT_DEVICE', device });
  };

  // Silently refreshes the currently-selected device's data (used for auto-refresh in dashboard)
  const refreshSelectedDevice = async () => {
    if (!state.selectedDevice) return;
    try {
      const response = await devicesService.getDevices();
      if (response.success && response.data) {
        const updated = response.data.find((d: any) => d.id === state.selectedDevice!.id);
        if (updated) {
          const mapped: Device = {
            id: updated.id,
            name: updated.name,
            type: updated.type,
            location: updated.location,
            status: updated.status,
            batteryLevel: updated.batteryLevel ?? (updated as any).battery_level,
            deviceKey: updated.deviceKey,
            lastReading: updated.lastReading,
            wifiSettings: updated.wifiSettings,
            notificationPreferences: updated.notificationPreferences,
            createdAt: updated.createdAt ?? (updated as any).created_at,
            updatedAt: updated.updatedAt ?? (updated as any).updated_at,
          };
          dispatch({ type: 'SELECT_DEVICE', device: mapped });
        }
      }
    } catch {
      // Silently fail during background refresh
    }
  };

  const value: DevicesContextType = {
    ...state,
    fetchDevices,
    refreshSelectedDevice,
    addDevice,
    updateDevice,
    deleteDevice,
    selectDevice,
    setLoading,
    setError,
  };

  return (
    <DevicesContext.Provider value={value}>
      {children}
    </DevicesContext.Provider>
  );
}

export function useDevices(): DevicesContextType {
  const context = useContext(DevicesContext);
  if (context === undefined) {
    throw new Error('useDevices must be used within a DevicesProvider');
  }
  return context;
}