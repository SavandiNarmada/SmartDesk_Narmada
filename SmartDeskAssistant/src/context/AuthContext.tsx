import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AuthState, User, RegisterData } from '../types';
import { authService } from '../services/authService';
import { APIError } from '../services/apiClient';

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

type AuthContextType = AuthState & AuthActions;

type AuthAction = 
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'LOGIN_SUCCESS'; user: User }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; user: User };

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.loading,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.user,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: action.user,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', loading });
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Call real API
      const response = await authService.login({ email, password });
      
      if (response.success && response.data) {
        const user: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          fullName: (response.data.user as any).full_name || response.data.user.fullName,
          phoneNumber: (response.data.user as any).phone_number || response.data.user.phoneNumber,
          timezone: response.data.user.timezone,
          avatar: response.data.user.avatar,
        };
        
        dispatch({ type: 'LOGIN_SUCCESS', user });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Login failed. Please check your connection.';
      dispatch({ type: 'LOGIN_ERROR', error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      
      // Call real API
      const response = await authService.register(userData);
      
      if (response.success && response.data) {
        const user: User = {
          id: response.data.user.id,
          email: response.data.user.email,
          fullName: (response.data.user as any).full_name || response.data.user.fullName,
          phoneNumber: (response.data.user as any).phone_number || response.data.user.phoneNumber,
          timezone: response.data.user.timezone,
          avatar: response.data.user.avatar,
        };
        
        dispatch({ type: 'LOGIN_SUCCESS', user });
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Registration failed. Please check your connection.';
      dispatch({ type: 'LOGIN_ERROR', error: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // Call real API
      await authService.logout();
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error);
    } finally {
      // Clear tokens from API client
      authService.setToken(null);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      setLoading(true);
      
      // Convert camelCase to snake_case for API
      const apiData: any = {};
      if (userData.fullName !== undefined) apiData.full_name = userData.fullName;
      if (userData.phoneNumber !== undefined) apiData.phone_number = userData.phoneNumber;
      if (userData.timezone !== undefined) apiData.timezone = userData.timezone;
      if (userData.avatar !== undefined) apiData.avatar = userData.avatar;
      
      // Call real API
      const response = await authService.updateProfile(apiData);
      
      if (response.success && response.data) {
        const user: User = {
          id: response.data.id,
          email: response.data.email,
          fullName: (response.data as any).full_name || response.data.fullName,
          phoneNumber: (response.data as any).phone_number || response.data.phoneNumber,
          timezone: response.data.timezone,
          avatar: response.data.avatar,
        };
        
        dispatch({ type: 'UPDATE_PROFILE', user });
      } else {
        throw new Error(response.error || 'Update failed');
      }
    } catch (error) {
      const errorMessage = error instanceof APIError 
        ? error.message 
        : 'Update failed. Please check your connection.';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    setLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}