import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard, SDAButton } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const renderMenuOption = (
    title: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    onPress: () => void,
    rightText?: string
  ) => (
    <TouchableOpacity onPress={onPress}>
      <SDACard padding="medium">
        <View style={styles.menuOption}>
          <View style={styles.menuLeft}>
            <MaterialIcons name={icon} size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.onSurface }]}>
              {title}
            </Text>
          </View>
          <View style={styles.menuRight}>
            {rightText && (
              <Text style={[styles.rightText, { color: colors.onBackground }]}>
                {rightText}
              </Text>
            )}
            <MaterialIcons name="chevron-right" size={24} color={colors.disabled} />
          </View>
        </View>
      </SDACard>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* User Info */}
        <SDACard padding="large">
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={[styles.userName, { color: colors.onSurface }]}>
              {user?.fullName || 'User Name'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.onBackground }]}>
              {user?.email || 'user@example.com'}
            </Text>
            <SDAButton
              title="Edit Profile"
              onPress={handleEditProfile}
              variant="outlined"
              size="small"
            />
          </View>
        </SDACard>

        {/* Account Settings */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Account
        </Text>

        {renderMenuOption('Edit Profile', 'person', handleEditProfile)}
        {renderMenuOption('Device Management', 'devices', () => navigation.navigate('DevicesTab'))}
        {renderMenuOption('Notification Settings', 'notifications', handleSettings)}

        {/* App Settings */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          App Settings
        </Text>

        <TouchableOpacity onPress={toggleTheme}>
          <SDACard padding="medium">
            <View style={styles.menuOption}>
              <View style={styles.menuLeft}>
                <MaterialIcons 
                  name={isDarkMode ? 'light-mode' : 'dark-mode'} 
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={[styles.menuText, { color: colors.onSurface }]}>
                  Theme
                </Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={[styles.rightText, { color: colors.onBackground }]}>
                  {isDarkMode ? 'Dark' : 'Light'}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color={colors.disabled} />
              </View>
            </View>
          </SDACard>
        </TouchableOpacity>

        {renderMenuOption('Settings', 'settings', handleSettings)}
        {renderMenuOption('S3 IoT Connect', 'cloud', () => navigation.navigate('ProtonestSetup'))}
        {renderMenuOption('Sensor Thresholds', 'tune', () => navigation.navigate('ThresholdSettings'))}
        {renderMenuOption('Units', 'straighten', handleSettings, 'Metric')}

        {/* Support */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Support & Help
        </Text>

        {renderMenuOption('Help Center', 'help', () => console.log('Help'))}
        {renderMenuOption('Contact Support', 'support', () => console.log('Support'))}
        {renderMenuOption('Privacy Policy', 'privacy-tip', () => console.log('Privacy'))}
        {renderMenuOption('Terms of Service', 'description', () => console.log('Terms'))}
        {renderMenuOption('About', 'info', () => console.log('About'), 'v1.0.0')}

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <SDAButton
            title="Logout"
            onPress={handleLogout}
            variant="outlined"
            fullWidth
            icon="logout"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.onBackground }]}>
            Smart Desk Assistant v1.0.0
          </Text>
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
  userInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  userEmail: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  menuOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    marginLeft: SPACING.SM,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightText: {
    fontSize: 14,
    marginRight: SPACING.XS,
    opacity: 0.7,
  },
  logoutContainer: {
    marginTop: SPACING.LG,
    marginBottom: SPACING.LG,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.LG,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
  },
});