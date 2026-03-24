import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SDAButton, SDAInput, SDALoader } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SCREEN_NAMES, SPACING, VALIDATION_RULES } from '../../constants';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { login, isLoading } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!VALIDATION_RULES.EMAIL.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      newErrors.password = `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate(SCREEN_NAMES.FORGOT_PASSWORD);
  };

  const handleSignUp = () => {
    navigation.navigate(SCREEN_NAMES.REGISTER);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <SDALoader visible={isLoading} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onBackground }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: colors.onBackground }]}>
          Sign in to your Smart Desk Assistant account
        </Text>
      </View>

      <View style={styles.form}>
        <SDAInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          error={errors.email}
          required
        />

        <SDAInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
          error={errors.password}
          required
        />

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={handleForgotPassword}
        >
          <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <SDAButton
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
          size="large"
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.signUpText, { color: colors.onBackground }]}>
          Don't have an account?{' '}
          <Text 
            style={[styles.signUpLink, { color: colors.primary }]}
            onPress={handleSignUp}
          >
            Sign up
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.LG,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 16,
  },
  signUpLink: {
    fontWeight: '600',
  },
});
