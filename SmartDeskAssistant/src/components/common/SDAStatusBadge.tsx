import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../../constants';

interface SDAStatusBadgeProps {
  status: 'online' | 'offline' | 'connecting' | 'error';
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export const SDAStatusBadge: React.FC<SDAStatusBadgeProps> = ({
  status,
  text,
  size = 'medium',
}) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: colors.success,
          icon: 'wifi' as keyof typeof MaterialIcons.glyphMap,
          defaultText: 'Online',
        };
      case 'offline':
        return {
          color: colors.error,
          icon: 'wifi-off' as keyof typeof MaterialIcons.glyphMap,
          defaultText: 'Offline',
        };
      case 'connecting':
        return {
          color: colors.warning,
          icon: 'wifi-strength-2' as keyof typeof MaterialIcons.glyphMap,
          defaultText: 'Connecting',
        };
      case 'error':
        return {
          color: colors.error,
          icon: 'error' as keyof typeof MaterialIcons.glyphMap,
          defaultText: 'Error',
        };
      default:
        return {
          color: colors.disabled,
          icon: 'help' as keyof typeof MaterialIcons.glyphMap,
          defaultText: 'Unknown',
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: 12,
          iconSize: 14,
          padding: SPACING.XS,
          borderRadius: BORDER_RADIUS.INPUT / 2,
        };
      case 'large':
        return {
          fontSize: 16,
          iconSize: 20,
          padding: SPACING.SM,
          borderRadius: BORDER_RADIUS.BUTTON,
        };
      default: // medium
        return {
          fontSize: 14,
          iconSize: 16,
          padding: SPACING.XS,
          borderRadius: BORDER_RADIUS.INPUT,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();

  const badgeStyle = {
    backgroundColor: statusConfig.color + '20', // 20% opacity
    borderColor: statusConfig.color,
    borderRadius: sizeConfig.borderRadius,
    padding: sizeConfig.padding,
  };

  return (
    <View style={[styles.badge, badgeStyle]}>
      <MaterialIcons
        name={statusConfig.icon}
        size={sizeConfig.iconSize}
        color={statusConfig.color}
        style={styles.icon}
      />
      <Text style={[
        styles.text,
        {
          color: statusConfig.color,
          fontSize: sizeConfig.fontSize,
        }
      ]}>
        {text || statusConfig.defaultText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: SPACING.XS / 2,
  },
  text: {
    fontWeight: '500',
  },
});