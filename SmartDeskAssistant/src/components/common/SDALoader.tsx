import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants';

interface SDALoaderProps {
  visible: boolean;
  text?: string;
  overlay?: boolean;
}

export const SDALoader: React.FC<SDALoaderProps> = ({
  visible,
  text = 'Loading...',
  overlay = true,
}) => {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  const content = (
    <View style={[styles.container, { backgroundColor: overlay ? 'rgba(0,0,0,0.5)' : 'transparent' }]}>
      <View style={[styles.loaderContainer, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {text && (
          <Text style={[styles.text, { color: colors.onSurface }]}>
            {text}
          </Text>
        )}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    padding: SPACING.LG,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    marginTop: SPACING.MD,
    fontSize: 16,
    textAlign: 'center',
  },
});