import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SDALoader } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SCREEN_NAMES, SPACING } from '../../constants';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading && !isAuthenticated) {
        navigation.replace(SCREEN_NAMES.LOGIN);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>SDA</Text>
          </View>
          <Text style={[styles.appName, { color: colors.onBackground }]}>
            Smart Desk Assistant
          </Text>
        </View>
        
        <View style={styles.loaderContainer}>
          <SDALoader visible={true} text="Initializing..." overlay={false} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: SPACING.XXL * 2,
  },
});
