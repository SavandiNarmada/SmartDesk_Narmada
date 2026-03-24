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

// Push notifications — must be active at root level at all times
import { usePushNotifications } from './src/hooks/usePushNotifications';

function AppContent() {
  usePushNotifications();
  return (
    <>
      <Navigation />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DevicesProvider>
            <RealtimeProvider>
              <AppContent />
            </RealtimeProvider>
          </DevicesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
