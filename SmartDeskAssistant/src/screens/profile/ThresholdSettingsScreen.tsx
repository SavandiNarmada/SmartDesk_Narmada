import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDAButton, SDACard } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants';
import { thresholdsService } from '../../services/thresholdsService';
import { SensorThresholds, DEFAULT_THRESHOLDS } from '../../types';

const STEP_SIZES: Record<string, number> = {
  aqi_excellent_max: 5,
  aqi_good_max: 10,
  aqi_moderate_max: 10,
  light_low_min: 10,
  light_good_min: 25,
  light_good_max: 25,
  light_bright_max: 100,
  noise_quiet_max: 5,
  noise_moderate_max: 5,
  noise_loud_max: 5,
  temp_cold_max: 1,
  temp_good_min: 1,
  temp_good_max: 1,
  temp_hot_min: 1,
  humidity_dry_max: 5,
  humidity_good_min: 5,
  humidity_good_max: 5,
  humidity_wet_min: 5,
  offset_air_quality: 5,
  offset_light_level: 10,
  offset_noise_level: 2,
  offset_temperature: 0.5,
  offset_humidity: 2,
};

interface StepperProps {
  label: string;
  value: number;
  step: number;
  unit: string;
  onIncrement: () => void;
  onDecrement: () => void;
  colors: any;
}

const Stepper: React.FC<StepperProps> = ({ label, value, step, unit, onIncrement, onDecrement, colors }) => (
  <View style={stepperStyles.container}>
    <Text style={[stepperStyles.label, { color: colors.onSurface }]}>{label}</Text>
    <View style={stepperStyles.controls}>
      <TouchableOpacity
        onPress={onDecrement}
        style={[stepperStyles.button, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons name="remove" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={[stepperStyles.value, { color: colors.onSurface }]}>
        {value} {unit}
      </Text>
      <TouchableOpacity
        onPress={onIncrement}
        style={[stepperStyles.button, { backgroundColor: colors.primary }]}
      >
        <MaterialIcons name="add" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  </View>
);

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  label: { fontSize: 14, flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: { fontSize: 14, fontWeight: '600', minWidth: 60, textAlign: 'center' },
});

export const ThresholdSettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [thresholds, setThresholds] = useState<SensorThresholds>(DEFAULT_THRESHOLDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      const response = await thresholdsService.getThresholds();
      if (response.success && response.data) {
        setThresholds(response.data);
      }
    } catch (err) {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const updateValue = (key: keyof SensorThresholds, delta: number) => {
    setThresholds(prev => ({
      ...prev,
      [key]: parseFloat((Number(prev[key]) + delta).toFixed(1)),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await thresholdsService.updateThresholds(thresholds);
      if (response.success) {
        Alert.alert('Success', 'Thresholds saved');
      } else {
        Alert.alert('Error', 'Failed to save thresholds');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save thresholds');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset', 'Reset all thresholds to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            await thresholdsService.resetThresholds();
            setThresholds(DEFAULT_THRESHOLDS);
            Alert.alert('Success', 'Thresholds reset to defaults');
          } catch (err) {
            Alert.alert('Error', 'Failed to reset thresholds');
          }
        },
      },
    ]);
  };

  const renderSection = (
    title: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    fields: Array<{ key: keyof SensorThresholds; label: string; unit: string }>
  ) => (
    <View key={title}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>{title}</Text>
      </View>
      <SDACard padding="medium">
        {fields.map(({ key, label, unit }) => (
          <Stepper
            key={key}
            label={label}
            value={thresholds[key] as number}
            step={STEP_SIZES[key] || 1}
            unit={unit}
            onIncrement={() => updateValue(key, STEP_SIZES[key] || 1)}
            onDecrement={() => updateValue(key, -(STEP_SIZES[key] || 1))}
            colors={colors}
          />
        ))}
      </SDACard>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.onBackground }}>Loading thresholds...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {renderSection('Air Quality (AQI)', 'air', [
          { key: 'aqi_excellent_max', label: 'Excellent max', unit: 'AQI' },
          { key: 'aqi_good_max', label: 'Good max', unit: 'AQI' },
          { key: 'aqi_moderate_max', label: 'Moderate max', unit: 'AQI' },
        ])}

        {renderSection('Light Level (lux)', 'wb-sunny', [
          { key: 'light_low_min', label: 'Low min', unit: 'lux' },
          { key: 'light_good_min', label: 'Good min', unit: 'lux' },
          { key: 'light_good_max', label: 'Good max', unit: 'lux' },
          { key: 'light_bright_max', label: 'Bright max', unit: 'lux' },
        ])}

        {renderSection('Noise Level (dB)', 'volume-up', [
          { key: 'noise_quiet_max', label: 'Quiet max', unit: 'dB' },
          { key: 'noise_moderate_max', label: 'Moderate max', unit: 'dB' },
          { key: 'noise_loud_max', label: 'Loud max', unit: 'dB' },
        ])}

        {renderSection('Temperature', 'device-thermostat', [
          { key: 'temp_cold_max', label: 'Cold max', unit: '\u00b0C' },
          { key: 'temp_good_min', label: 'Good min', unit: '\u00b0C' },
          { key: 'temp_good_max', label: 'Good max', unit: '\u00b0C' },
          { key: 'temp_hot_min', label: 'Hot min', unit: '\u00b0C' },
        ])}

        {renderSection('Humidity', 'water-drop', [
          { key: 'humidity_dry_max', label: 'Dry max', unit: '%' },
          { key: 'humidity_good_min', label: 'Good min', unit: '%' },
          { key: 'humidity_good_max', label: 'Good max', unit: '%' },
          { key: 'humidity_wet_min', label: 'Wet min', unit: '%' },
        ])}

        {renderSection('Calibration Offsets', 'tune', [
          { key: 'offset_air_quality', label: 'Air Quality', unit: 'AQI' },
          { key: 'offset_light_level', label: 'Light Level', unit: 'lux' },
          { key: 'offset_noise_level', label: 'Noise Level', unit: 'dB' },
          { key: 'offset_temperature', label: 'Temperature', unit: '\u00b0C' },
          { key: 'offset_humidity', label: 'Humidity', unit: '%' },
        ])}

        <View style={styles.buttonContainer}>
          <SDAButton title="Save Thresholds" onPress={handleSave} loading={isSaving} fullWidth />
          <SDAButton title="Reset to Defaults" onPress={handleReset} variant="outlined" fullWidth />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.MD, paddingBottom: SPACING.XL },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.XS, marginTop: SPACING.LG, marginBottom: SPACING.SM },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  buttonContainer: { gap: SPACING.MD, marginTop: SPACING.XL },
});
