import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ThemeState, ColorScheme } from '../types';
import { COLORS, DARK_COLORS } from '../constants';

interface ThemeActions {
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

type ThemeContextType = ThemeState & ThemeActions;

type ThemeAction = 
  | { type: 'TOGGLE_THEME' }
  | { type: 'SET_THEME'; isDark: boolean };

const initialState: ThemeState = {
  isDarkMode: false,
  colors: COLORS,
};

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
        colors: !state.isDarkMode ? DARK_COLORS : COLORS,
      };
    case 'SET_THEME':
      return {
        ...state,
        isDarkMode: action.isDark,
        colors: action.isDark ? DARK_COLORS : COLORS,
      };
    default:
      return state;
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const setTheme = (isDark: boolean) => {
    dispatch({ type: 'SET_THEME', isDark });
  };

  const value: ThemeContextType = {
    ...state,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}