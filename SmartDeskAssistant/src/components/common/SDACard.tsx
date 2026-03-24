import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS, ELEVATION } from '../../constants';

interface SDACardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  elevation?: number;
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const SDACard: React.FC<SDACardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  elevation = ELEVATION.LOW,
  padding = 'medium',
  style,
}) => {
  const { colors, isDarkMode } = useTheme();

  const getPaddingStyle = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return SPACING.SM;
      case 'large':
        return SPACING.LG;
      default: // medium
        return SPACING.MD;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.CARD,
    padding: getPaddingStyle(),
    elevation: elevation,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: elevation,
    },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: elevation * 2,
    // In dark mode, add a subtle border for card definition
    ...(isDarkMode && {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    }),
    ...style,
  };

  const CardContent = () => (
    <View style={cardStyle}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && (
            <Text style={[styles.title, { color: colors.onSurface }]}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.onBackground }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  header: {
    marginBottom: SPACING.SM,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  content: {
    // Content wrapper
  },
});