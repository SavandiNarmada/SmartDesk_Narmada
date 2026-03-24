import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDAButton, SDAInput, SDACard } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants';
import { protonestService } from '../../services/protonestService';
import { ProtonestCredentials } from '../../types';

export const ProtonestSetupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<ProtonestCredentials | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await protonestService.getCredentials();
      if (response.success && response.data) {
        setCredentials(response.data);
        if (response.data.email) {
          setEmail(response.data.email);
        }
      }
    } catch (err) {
      // Not connected yet
    }
  };

  const handleSave = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await protonestService.saveCredentials(email.trim(), password.trim());
      if (response.success) {
        Alert.alert('Success', 'S3 IoT Connect credentials saved and verified');
        setCredentials(response.data!);
        setPassword('');
      } else {
        Alert.alert('Error', response.error || 'Failed to save credentials');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await protonestService.triggerSync();
      if (response.success) {
        Alert.alert('Success', 'Sync completed successfully');
      } else {
        Alert.alert('Error', 'Sync failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to remove your S3 IoT credentials?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await protonestService.deleteCredentials();
              setCredentials(null);
              setEmail('');
              setPassword('');
              Alert.alert('Success', 'S3 IoT credentials removed');
            } catch (err) {
              Alert.alert('Error', 'Failed to remove credentials');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Connection Status */}
        <SDACard padding="large">
          <View style={styles.statusContainer}>
            <MaterialIcons
              name={credentials?.connected ? 'cloud-done' : 'cloud-off'}
              size={48}
              color={credentials?.connected ? colors.success : colors.disabled}
            />
            <Text style={[styles.statusTitle, { color: colors.onSurface }]}>
              {credentials?.connected ? 'Connected' : 'Not Connected'}
            </Text>
            {credentials?.connected && credentials.email && (
              <Text style={[styles.statusEmail, { color: colors.onBackground }]}>
                {credentials.email}
              </Text>
            )}
          </View>
        </SDACard>

        {/* Credentials Form */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          S3 IoT Connect Credentials
        </Text>

        <SDAInput
          label="S3 IoT Email"
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <SDAInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your S3 IoT password"
          secureTextEntry
        />

        <Text style={[styles.hint, { color: colors.disabled }]}>
          Use your S3 IoT Connect account credentials (email and password).
        </Text>

        <View style={styles.buttonContainer}>
          <SDAButton
            title="Save & Verify"
            onPress={handleSave}
            loading={isLoading}
            fullWidth
          />

          {credentials?.connected && (
            <>
              <SDAButton
                title="Sync Now"
                onPress={handleSync}
                loading={isLoading}
                variant="outlined"
                icon="sync"
                fullWidth
              />
              <SDAButton
                title="Disconnect"
                onPress={handleDisconnect}
                variant="outlined"
                fullWidth
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.MD, paddingBottom: SPACING.XL },
  statusContainer: { alignItems: 'center', paddingVertical: SPACING.MD },
  statusTitle: { fontSize: 20, fontWeight: '600', marginTop: SPACING.SM },
  statusEmail: { fontSize: 14, opacity: 0.7, marginTop: SPACING.XS },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: SPACING.LG, marginBottom: SPACING.MD },
  hint: { fontSize: 12, lineHeight: 18, marginTop: SPACING.XS, marginBottom: SPACING.MD },
  buttonContainer: { gap: SPACING.MD, marginTop: SPACING.LG },
});
