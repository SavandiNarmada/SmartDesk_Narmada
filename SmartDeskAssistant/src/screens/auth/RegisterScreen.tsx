import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SDAButton, SDAInput, SDALoader } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SCREEN_NAMES, SPACING, VALIDATION_RULES } from '../../constants';
import { RegisterData } from '../../types';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { register, isLoading } = useAuth();
  const { colors } = useTheme();

  const [formData, setFormData] = useState<RegisterData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Partial<RegisterData>>({});

  const updateField = (field: keyof RegisterData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<RegisterData> = {};

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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      newErrors.password = `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 6) return { strength: 1, text: 'Weak' };
    if (password.length < 8) return { strength: 2, text: 'Fair' };
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return { strength: 4, text: 'Strong' };
    }
    return { strength: 3, text: 'Good' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData);
    } catch (error) {
      Alert.alert('Registration Failed', 'An error occurred during registration. Please try again.');
    }
  };

  const handleSignIn = () => {
    navigation.navigate(SCREEN_NAMES.LOGIN);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <SDALoader visible={isLoading} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          Create Account
        </Text>
        <Text style={[styles.subtitle, { color: colors.onBackground }]}>
          Join Smart Desk Assistant to start monitoring your workspace
        </Text>
      </View>

      <View style={styles.form}>
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
        />

        <SDAInput
          label="Password"
          value={formData.password}
          onChangeText={(text) => updateField('password', text)}
          placeholder="Create a password"
          secureTextEntry
          error={errors.password}
          required
        />

        {formData.password.length > 0 && (
          <View style={styles.passwordStrength}>
            <Text style={[styles.strengthText, { color: colors.onBackground }]}>
              Password strength: {passwordStrength.text}
            </Text>
            <View style={styles.strengthBar}>
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: level <= passwordStrength.strength
                        ? passwordStrength.strength <= 2 ? colors.error : colors.success
                        : colors.disabled,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <SDAInput
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) => updateField('confirmPassword', text)}
          placeholder="Confirm your password"
          secureTextEntry
          error={errors.confirmPassword}
          required
        />

        <TouchableOpacity 
          style={styles.termsContainer}
          onPress={() => updateField('acceptTerms', !formData.acceptTerms)}
        >
          <View style={[
            styles.checkbox,
            { borderColor: colors.primary },
            formData.acceptTerms && { backgroundColor: colors.primary }
          ]}>
            {formData.acceptTerms && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={[styles.termsText, { color: colors.onBackground }]}>
            I accept the{' '}
            <Text style={{ color: colors.primary }}>Terms & Conditions</Text>
          </Text>
        </TouchableOpacity>
        {errors.acceptTerms && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors.acceptTerms}
          </Text>
        )}

        <SDAButton
          title="Create Account"
          onPress={handleRegister}
          loading={isLoading}
          fullWidth
          size="large"
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.signInText, { color: colors.onBackground }]}>
          Already have an account?{' '}
          <Text 
            style={[styles.signInLink, { color: colors.primary }]}
            onPress={handleSignIn}
          >
            Sign in
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SPACING.LG,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    marginBottom: SPACING.XL,
  },
  passwordStrength: {
    marginBottom: SPACING.MD,
  },
  strengthText: {
    fontSize: 12,
    marginBottom: SPACING.XS,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: SPACING.XS / 2,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: SPACING.SM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    marginBottom: SPACING.MD,
  },
  footer: {
    alignItems: 'center',
  },
  signInText: {
    fontSize: 16,
  },
  signInLink: {
    fontWeight: '600',
  },
});
