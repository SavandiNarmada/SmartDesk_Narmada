import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants';
import { userService } from '../../services/userService';

export const SettingsScreen: React.FC = () => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    notifications: {
      threshold_alerts: true,
      daily_summary: true,
      weekly_report: false,
      device_offline: true,
      push_notifications: true,
    },
    units: {
      temperature: 'celsius',
      distance: 'metric',
    },
    privacy: {
      data_collection: true,
      analytics: false,
      crash_reports: true,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Map local settings structure to API UserSettings format
      await userService.updateSettings({
        notifications_enabled: settings.notifications.push_notifications,
        data_privacy_analytics: settings.privacy.analytics,
      });
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderToggleOption = (
    title: string,
    description: string,
    category: string,
    key: string,
    value: boolean
  ) => (
    <TouchableOpacity onPress={() => updateSetting(category, key, !value)}>
      <SDACard padding="medium">
        <View style={styles.settingOption}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
              {title}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.onBackground }]}>
              {description}
            </Text>
          </View>
          <View style={[
            styles.toggle,
            { backgroundColor: value ? colors.primary : colors.disabled }
          ]}>
            <View style={[
              styles.toggleKnob,
              { 
                backgroundColor: colors.surface,
                transform: [{ translateX: value ? 20 : 2 }],
              }
            ]} />
          </View>
        </View>
      </SDACard>
    </TouchableOpacity>
  );

  const renderSelectOption = (
    title: string,
    description: string,
    options: { label: string; value: string }[],
    category: string,
    key: string,
    currentValue: string
  ) => (
    <SDACard padding="medium">
      <View style={styles.settingOption}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
            {title}
          </Text>
          <Text style={[styles.settingDescription, { color: colors.onBackground }]}>
            {description}
          </Text>
        </View>
      </View>
      <View style={styles.optionsList}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => updateSetting(category, key, option.value)}
            style={[
              styles.optionItem,
              { borderColor: colors.disabled }
            ]}
          >
            <View style={[
              styles.radio,
              { borderColor: colors.primary }
            ]}>
              {currentValue === option.value && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <Text style={[styles.optionText, { color: colors.onSurface }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SDACard>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Appearance */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Appearance
        </Text>

        <TouchableOpacity onPress={toggleTheme}>
          <SDACard padding="medium">
            <View style={styles.settingOption}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.onSurface }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingDescription, { color: colors.onBackground }]}>
                  Switch between light and dark theme
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: isDarkMode ? colors.primary : colors.disabled }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  { 
                    backgroundColor: colors.surface,
                    transform: [{ translateX: isDarkMode ? 20 : 2 }],
                  }
                ]} />
              </View>
            </View>
          </SDACard>
        </TouchableOpacity>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Notifications
        </Text>

        {renderToggleOption(
          'Push Notifications',
          'Receive push notifications on your device',
          'notifications',
          'push_notifications',
          settings.notifications.push_notifications
        )}

        {renderToggleOption(
          'Threshold Alerts',
          'Get notified when readings exceed safe levels',
          'notifications',
          'threshold_alerts',
          settings.notifications.threshold_alerts
        )}

        {renderToggleOption(
          'Daily Summary',
          'Receive daily summaries of your workspace environment',
          'notifications',
          'daily_summary',
          settings.notifications.daily_summary
        )}

        {renderToggleOption(
          'Weekly Report',
          'Get weekly reports with insights and trends',
          'notifications',
          'weekly_report',
          settings.notifications.weekly_report
        )}

        {renderToggleOption(
          'Device Offline Alerts',
          'Get notified when devices go offline',
          'notifications',
          'device_offline',
          settings.notifications.device_offline
        )}

        {/* Units */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Units & Measurements
        </Text>

        {renderSelectOption(
          'Temperature Unit',
          'Choose your preferred temperature scale',
          [
            { label: 'Celsius (°C)', value: 'celsius' },
            { label: 'Fahrenheit (°F)', value: 'fahrenheit' },
          ],
          'units',
          'temperature',
          settings.units.temperature
        )}

        {renderSelectOption(
          'Distance Unit',
          'Choose your preferred measurement system',
          [
            { label: 'Metric (meters, kg)', value: 'metric' },
            { label: 'Imperial (feet, lbs)', value: 'imperial' },
          ],
          'units',
          'distance',
          settings.units.distance
        )}

        {/* Privacy */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Data & Privacy
        </Text>

        {renderToggleOption(
          'Data Collection',
          'Allow anonymous data collection to improve the app',
          'privacy',
          'data_collection',
          settings.privacy.data_collection
        )}

        {renderToggleOption(
          'Usage Analytics',
          'Help us understand how you use the app',
          'privacy',
          'analytics',
          settings.privacy.analytics
        )}

        {renderToggleOption(
          'Crash Reports',
          'Automatically send crash reports to help fix issues',
          'privacy',
          'crash_reports',
          settings.privacy.crash_reports
        )}

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          About
        </Text>

        <SDACard padding="medium">
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutTitle, { color: colors.onSurface }]}>
              Smart Desk Assistant
            </Text>
            <Text style={[styles.aboutVersion, { color: colors.onBackground }]}>
              Version 1.0.0
            </Text>
            <Text style={[styles.aboutDescription, { color: colors.onBackground }]}>
              Monitor and optimize your workspace environment with intelligent insights.
            </Text>
          </View>
        </SDACard>

        {/* Save Button */}
        <TouchableOpacity 
          onPress={saveSettings}
          disabled={isLoading}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: SPACING.XS / 2,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  optionsList: {
    marginTop: SPACING.SM,
    gap: SPACING.XS,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.SM,
    borderWidth: 1,
    borderRadius: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: SPACING.SM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 14,
  },
  aboutInfo: {
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  aboutVersion: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: SPACING.SM,
  },
  aboutDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  saveButton: {
    marginTop: SPACING.LG,
    padding: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});