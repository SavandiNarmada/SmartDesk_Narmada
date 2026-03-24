import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../../constants';

interface SDAButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  fullWidth?: boolean;
}

export const SDAButton: React.FC<SDAButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    const baseStyle: any = {
      borderRadius: BORDER_RADIUS.BUTTON,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = SPACING.SM;
        baseStyle.paddingVertical = SPACING.XS;
        baseStyle.minHeight = 32;
        break;
      case 'large':
        baseStyle.paddingHorizontal = SPACING.LG;
        baseStyle.paddingVertical = SPACING.MD;
        baseStyle.minHeight = 56;
        break;
      default: // medium
        baseStyle.paddingHorizontal = SPACING.MD;
        baseStyle.paddingVertical = SPACING.SM;
        baseStyle.minHeight = 44;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'outlined':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.primary;
        break;
      case 'text':
        baseStyle.backgroundColor = 'transparent';
        break;
      default: // primary
        baseStyle.backgroundColor = colors.primary;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle: any = {
      fontFamily: 'System',
      fontWeight: '600',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.fontSize = 14;
        break;
      case 'large':
        baseStyle.fontSize = 18;
        break;
      default: // medium
        baseStyle.fontSize = 16;
    }

    // Variant styles
    switch (variant) {
      case 'outlined':
      case 'text':
        baseStyle.color = colors.primary;
        break;
      default: // primary, secondary
        baseStyle.color = '#FFFFFF';
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.color = colors.disabled;
    }

    return baseStyle;
  };

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  const iconColor = variant === 'outlined' || variant === 'text' ? colors.primary : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outlined' || variant === 'text' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <MaterialIcons
              name={icon}
              size={iconSize}
              color={disabled ? colors.disabled : iconColor}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    // Base styles are applied dynamically
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: SPACING.XS,
  },
});