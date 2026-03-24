import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SDAButton, SDAInput, SDALoader } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, VALIDATION_RULES } from '../../constants';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!VALIDATION_RULES.EMAIL.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    setError('');
    return true;
  };

  const handleSendResetLink = async () => {
    if (!validateEmail()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsEmailSent(true);
      Alert.alert(
        'Reset Link Sent',
        'If an account with this email exists, you will receive a password reset link shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (isEmailSent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={[styles.successTitle, { color: colors.onBackground }]}>
            Check Your Email
          </Text>
          <Text style={[styles.successMessage, { color: colors.onBackground }]}>
            We've sent a password reset link to {email}
          </Text>
          <SDAButton
            title="Back to Login"
            onPress={handleBackToLogin}
            fullWidth
            size="large"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <SDALoader visible={isLoading} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          Forgot Password?
        </Text>
        <Text style={[styles.subtitle, { color: colors.onBackground }]}>
          Enter your email address and we'll send you a link to reset your password
        </Text>
      </View>

      <View style={styles.form}>
        <SDAInput
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError('');
          }}
          placeholder="Enter your email"
          keyboardType="email-address"
          error={error}
          required
        />

        <SDAButton
          title="Send Reset Link"
          onPress={handleSendResetLink}
          loading={isLoading}
          fullWidth
          size="large"
        />
      </View>

      <View style={styles.footer}>
        <SDAButton
          title="Back to Login"
          onPress={handleBackToLogin}
          variant="text"
          fullWidth
        />
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
    lineHeight: 24,
  },
  form: {
    marginBottom: SPACING.XL,
  },
  footer: {
    alignItems: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  successIconText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: SPACING.XXL,
    lineHeight: 24,
  },
});