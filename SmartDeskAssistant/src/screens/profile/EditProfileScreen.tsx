import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SDAButton, SDAInput, SDALoader } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, VALIDATION_RULES } from '../../constants';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateProfile, isLoading } = useAuth();
  const { colors } = useTheme();

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    timezone: user?.timezone || 'UTC',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!VALIDATION_RULES.EMAIL.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phoneNumber && formData.phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateProfile({
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        timezone: formData.timezone,
      });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <SDALoader visible={isLoading} />
      
      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Personal Information
        </Text>

        <SDAInput
          label="Full Name"
          value={formData.fullName}
          onChangeText={(text) => updateField('fullName', text)}
          placeholder="Enter your full name"
          error={errors.fullName}
          required
        />

        <SDAInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          placeholder="Enter your email"
          keyboardType="email-address"
          error={errors.email}
          required
          disabled
        />

        <SDAInput
          label="Phone Number"
          value={formData.phoneNumber}
          onChangeText={(text) => updateField('phoneNumber', text)}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          error={errors.phoneNumber}
        />

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.onBackground }]}>
            Timezone
          </Text>
          <View style={styles.timezoneContainer}>
            {timezones.map((tz) => (
              <SDAButton
                key={tz}
                title={tz}
                onPress={() => updateField('timezone', tz)}
                variant={formData.timezone === tz ? 'primary' : 'outlined'}
                size="small"
                fullWidth
              />
            ))}
          </View>
        </View>

        <Text style={[styles.note, { color: colors.onBackground }]}>
          Note: Email address cannot be changed. Contact support if you need to update your email.
        </Text>

        <View style={styles.buttonContainer}>
          <SDAButton
            title="Cancel"
            onPress={handleCancel}
            variant="outlined"
            fullWidth
          />
          <SDAButton
            title="Save Changes"
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  timezoneContainer: {
    gap: SPACING.SM,
  },
  note: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: SPACING.LG,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.MD,
    marginTop: SPACING.LG,
  },
});