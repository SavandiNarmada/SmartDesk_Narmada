import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { DevicesProvider } from './src/context/DevicesContext';
import { RealtimeProvider } from './src/context/RealtimeContext';

// Navigation
import Navigation from './src/navigation/Navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DevicesProvider>
            <RealtimeProvider>
              <Navigation />
              <StatusBar style="auto" />
            </RealtimeProvider>
          </DevicesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
