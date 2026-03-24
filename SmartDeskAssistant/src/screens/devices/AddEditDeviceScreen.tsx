import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDAButton, SDAInput, SDALoader, SDACard } from '../../components/common';
import { useDevices } from '../../context/DevicesContext';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, DEVICE_TYPES } from '../../constants';
import { Device, NewDevice } from '../../types';

export const AddEditDeviceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { addDevice, updateDevice, deleteDevice, isLoading } = useDevices();
  const { colors } = useTheme();

  const { mode, device } = route.params || { mode: 'add' };
  const isEditing = mode === 'edit';

  const [formData, setFormData] = useState({
    name: device?.name || '',
    type: device?.type || 'multi_sensor',
    location: device?.location || '',
    protonestDeviceId: device?.protonestDeviceId || '',
    thresholdAlerts: device?.notificationPreferences?.threshold_alerts || true,
    dailySummary: device?.notificationPreferences?.daily_summary || true,
    weeklyReport: device?.notificationPreferences?.weekly_report || false,
    deviceOffline: device?.notificationPreferences?.device_offline || true,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Device name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Device name must be at least 3 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const deviceData = {
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim(),
        protonestDeviceId: formData.protonestDeviceId.trim() || undefined,
        notificationPreferences: {
          threshold_alerts: formData.thresholdAlerts,
          daily_summary: formData.dailySummary,
          weekly_report: formData.weeklyReport,
          device_offline: formData.deviceOffline,
        },
      };

      if (isEditing) {
        await updateDevice(device.id, deviceData);
        Alert.alert('Success', 'Device updated successfully');
      } else {
        await addDevice(deviceData as NewDevice);
        Alert.alert('Success', 'Device added successfully');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} device`);
    }
  };

  const handleDelete = () => {
    if (!isEditing) return;

    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete "${device?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevice(device!.id);
              Alert.alert('Success', 'Device deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete device');
            }
          },
        },
      ]
    );
  };
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <SDALoader visible={isLoading} />

      <View>
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Device Information
        </Text>

        <SDAInput
          label="Device Name"
          value={formData.name}
          onChangeText={(text) => updateField('name', text)}
          placeholder="e.g., Office Desk Sensor"
          error={errors.name}
          required
        />

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.onBackground }]}>
            Device Type <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <View style={styles.typeContainer}>
            {DEVICE_TYPES.map((type) => (
              <SDAButton
                key={type.value}
                title={type.label}
                onPress={() => updateField('type', type.value)}
                variant={formData.type === type.value ? 'primary' : 'outlined'}
                size="small"
                fullWidth
              />
            ))}
          </View>
        </View>

        <SDAInput
          label="Location"
          value={formData.location}
          onChangeText={(text) => updateField('location', text)}
          placeholder="e.g., Home Office, Living Room"
          error={errors.location}
          required
        />

        <SDAInput
          label="S3 IoT Device ID"
          value={formData.protonestDeviceId}
          onChangeText={(text) => updateField('protonestDeviceId', text)}
          placeholder="e.g., Smart_Desk_Sensor_1"
        />

        <Text style={[styles.hint, { color: colors.disabled }]}>
          Enter the Device Name registered in S3 IoT Connect dashboard. This ID is provided by the firmware developer.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Notification Preferences
        </Text>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: colors.onBackground }]}>
            Threshold Alerts
          </Text>
          <SDAButton
            title={formData.thresholdAlerts ? 'ON' : 'OFF'}
            onPress={() => updateField('thresholdAlerts', !formData.thresholdAlerts)}
            variant={formData.thresholdAlerts ? 'primary' : 'outlined'}
            size="small"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: colors.onBackground }]}>
            Daily Summary
          </Text>
          <SDAButton
            title={formData.dailySummary ? 'ON' : 'OFF'}
            onPress={() => updateField('dailySummary', !formData.dailySummary)}
            variant={formData.dailySummary ? 'primary' : 'outlined'}
            size="small"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: colors.onBackground }]}>
            Weekly Report
          </Text>
          <SDAButton
            title={formData.weeklyReport ? 'ON' : 'OFF'}
            onPress={() => updateField('weeklyReport', !formData.weeklyReport)}
            variant={formData.weeklyReport ? 'primary' : 'outlined'}
            size="small"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: colors.onBackground }]}>
            Device Offline Alerts
          </Text>
          <SDAButton
            title={formData.deviceOffline ? 'ON' : 'OFF'}
            onPress={() => updateField('deviceOffline', !formData.deviceOffline)}
            variant={formData.deviceOffline ? 'primary' : 'outlined'}
            size="small"
          />
        </View>

        <View style={styles.buttonContainer}>
          {isEditing && (
            <SDAButton
              title="Delete Device"
              onPress={handleDelete}
              variant="outlined"
              fullWidth
            />
          )}
          <SDAButton
            title="Cancel"
            onPress={handleCancel}
            variant="outlined"
            fullWidth
          />
          <SDAButton
            title={isEditing ? 'Update Device' : 'Add Device'}
            onPress={handleSave}
            loading={isLoading}
            fullWidth
          />
        </View>
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
    paddingBottom: SPACING.XL,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  inputContainer: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.XS,
  },
  typeContainer: {
    gap: SPACING.SM,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: SPACING.MD,
    marginTop: SPACING.XL,
    marginBottom: SPACING.LG,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.MD,
  },
});
