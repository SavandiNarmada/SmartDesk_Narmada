import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../../constants';

interface SDAInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export const SDAInput: React.FC<SDAInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  required = false,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const inputStyle = {
    borderColor: error ? colors.error : isFocused ? colors.primary : colors.disabled,
    backgroundColor: disabled ? colors.disabled + '20' : colors.surface,
    color: disabled ? colors.disabled : colors.onSurface,
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onBackground }]}>
        {label}
        {required && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
      </Text>
      
      <View style={[styles.inputContainer, inputStyle]}>
        <TextInput
          style={[
            styles.input,
            { color: disabled ? colors.disabled : colors.onSurface },
            multiline && styles.multilineInput
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.disabled}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={togglePasswordVisibility}
            disabled={disabled}
          >
            <MaterialIcons
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={24}
              color={disabled ? colors.disabled : colors.onSurface}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.MD,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.XS,
  },
  required: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.INPUT,
    paddingHorizontal: SPACING.SM,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.SM,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  eyeIcon: {
    padding: SPACING.XS,
    marginLeft: SPACING.XS,
  },
  error: {
    fontSize: 12,
    marginTop: SPACING.XS / 2,
  },
});