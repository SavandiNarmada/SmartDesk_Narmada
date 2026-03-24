import React from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { SCREEN_NAMES } from '../constants';

// Auth Screens
import {
  SplashScreen,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
} from '../screens/auth';

// Device Screens
import {
  DevicesListScreen,
  AddEditDeviceScreen,
  DeviceDashboardScreen,
} from '../screens/devices';

// Report Screens
import {
  ReportsScreen,
  ReportDetailsScreen,
} from '../screens/reports';

// Insight Screens
import {
  InsightsScreen,
  InsightDetailsScreen,
} from '../screens/insights';

// Profile Screens
import {
  ProfileScreen,
  EditProfileScreen,
  SettingsScreen,
  ProtonestSetupScreen,
  ThresholdSettingsScreen,
} from '../screens/profile';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function getTabBarStyle(
  route: any,
  rootScreenName: string,
  colors: ReturnType<typeof useTheme>['colors']
) {
  const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? rootScreenName;

  if (focusedRouteName !== rootScreenName) {
    return { display: 'none' as const };
  }

  return {
    backgroundColor: colors.surface,
    borderTopColor: colors.disabled,
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
  };
}

// Auth Navigator
function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name={SCREEN_NAMES.SPLASH} component={SplashScreen} />
      <Stack.Screen name={SCREEN_NAMES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={SCREEN_NAMES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={SCREEN_NAMES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Devices Stack Navigator
function DevicesStackNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen 
        name={SCREEN_NAMES.DEVICES_LIST} 
        component={DevicesListScreen}
        options={{ title: 'My Devices' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.ADD_EDIT_DEVICE} 
        component={AddEditDeviceScreen}
        options={{ title: 'Device Settings' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.DEVICE_DASHBOARD} 
        component={DeviceDashboardScreen}
        options={{ title: 'Device Dashboard' }}
      />
    </Stack.Navigator>
  );
}

// Reports Stack Navigator
function ReportsStackNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen 
        name={SCREEN_NAMES.REPORTS} 
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.REPORT_DETAILS} 
        component={ReportDetailsScreen}
        options={{ title: 'Report Details' }}
      />
    </Stack.Navigator>
  );
}

// Insights Stack Navigator
function InsightsStackNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen 
        name={SCREEN_NAMES.INSIGHTS} 
        component={InsightsScreen}
        options={{ title: 'Insights' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.INSIGHT_DETAILS} 
        component={InsightDetailsScreen}
        options={{ title: 'Insight Details' }}
      />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStackNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen 
        name={SCREEN_NAMES.PROFILE} 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name={SCREEN_NAMES.EDIT_PROFILE} 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.SETTINGS}
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.PROTONEST_SETUP}
        component={ProtonestSetupScreen}
        options={{ title: 'S3 IoT Connect' }}
      />
      <Stack.Screen
        name={SCREEN_NAMES.THRESHOLD_SETTINGS}
        component={ThresholdSettingsScreen}
        options={{ title: 'Sensor Thresholds' }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.disabled,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name={SCREEN_NAMES.DEVICES_TAB}
        component={DevicesStackNavigator}
        options={({ route }) => ({
          title: 'Devices',
          tabBarStyle: getTabBarStyle(route, SCREEN_NAMES.DEVICES_LIST, colors),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name={SCREEN_NAMES.REPORTS_TAB}
        component={ReportsStackNavigator}
        options={({ route }) => ({
          title: 'Reports',
          tabBarStyle: getTabBarStyle(route, SCREEN_NAMES.REPORTS, colors),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="analytics" size={size} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name={SCREEN_NAMES.INSIGHTS_TAB}
        component={InsightsStackNavigator}
        options={({ route }) => ({
          title: 'Insights',
          tabBarStyle: getTabBarStyle(route, SCREEN_NAMES.INSIGHTS, colors),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="lightbulb" size={size} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name={SCREEN_NAMES.PROFILE_TAB}
        component={ProfileStackNavigator}
        options={({ route }) => ({
          title: 'Profile',
          tabBarStyle: getTabBarStyle(route, SCREEN_NAMES.PROFILE, colors),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" size={size} color={color} />
          ),
        })}
      />
    </Tab.Navigator>
  );
}

// Wrapper that registers push notifications when authenticated
function AuthenticatedApp() {
  usePushNotifications();
  return <MainNavigator />;
}

// App Navigator
function AppNavigator() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={AuthenticatedApp} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const { colors } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.onSurface,
          border: colors.disabled,
          notification: colors.error,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: 'bold' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <AppNavigator />
    </NavigationContainer>
  );
}
