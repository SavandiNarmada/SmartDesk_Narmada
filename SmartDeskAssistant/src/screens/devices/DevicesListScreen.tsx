import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard, SDAButton, SDALoader, SDAStatusBadge } from '../../components/common';
import { useDevices } from '../../context/DevicesContext';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, AQI_LEVELS, NOISE_LEVELS, LIGHT_LEVELS } from '../../constants';
import { Device } from '../../types';

const PulsingDot: React.FC<{ color: string }> = ({ color }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: anim, marginRight: 6 }} />
  );
};

export const DevicesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { devices, isLoading, fetchDevices, selectDevice, deleteDevice } = useDevices();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  };

  // Refetch devices every time this screen gets focus (including navigating back)
  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [])
  );

  const handleAddDevice = () => {
    navigation.navigate('AddEditDevice', { mode: 'add' });
  };

  const handleEditDevice = (device: Device) => {
    navigation.navigate('AddEditDevice', { mode: 'edit', device });
  };

  const handleViewDevice = (device: Device) => {
    selectDevice(device);
    navigation.navigate('DeviceDashboard');
  };

  const handleDeleteDevice = (device: Device) => {
    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete "${device.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDevice(device.id),
        },
      ]
    );
  };

  const renderDeviceCard = ({ item: device }: { item: Device }) => (
    <SDACard onPress={() => handleViewDevice(device)}>
      <View style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {device.status === 'online' && <PulsingDot color="#4CAF50" />}
              <Text style={[styles.deviceName, { color: colors.onSurface }]}>
                {device.name}
              </Text>
            </View>
            <Text style={[styles.deviceLocation, { color: colors.onBackground }]}>
              {device.location}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleEditDevice(device)}
          >
            <MaterialIcons name="more-vert" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.deviceStatus}>
          <SDAStatusBadge status={device.status} />
          {device.batteryLevel && (
            <Text style={[styles.battery, { color: colors.onBackground }]}>
              Battery: {device.batteryLevel}%
            </Text>
          )}
        </View>

        {device.lastReading && (
          <View style={styles.readings}>
            <Text style={[styles.readingsTitle, { color: colors.onSurface }]}>
              Latest Readings:
            </Text>
            {device.lastReading.timestamp && (
              <Text style={{ fontSize: 11, color: colors.onBackground, opacity: 0.6, marginBottom: SPACING.XS }}>
                {new Date(device.lastReading.timestamp).toLocaleString()}
              </Text>
            )}
            <View style={styles.readingItems}>
              {device.lastReading.airQuality != null && (() => {
                const v = Number(device.lastReading!.airQuality);
                const level = AQI_LEVELS.find(l => v >= l.min && v <= l.max);
                return (
                  <View style={[styles.readingBadge, { backgroundColor: (level?.color || colors.disabled) + '15' }]}>
                    <Text style={[styles.reading, { color: level?.color || colors.onBackground }]}>
                      AQI: {v.toFixed(1)}
                    </Text>
                  </View>
                );
              })()}
              {device.lastReading.lightLevel != null && (() => {
                const v = Number(device.lastReading!.lightLevel);
                const level = LIGHT_LEVELS.find(l => v >= l.min && v <= l.max);
                return (
                  <View style={[styles.readingBadge, { backgroundColor: (level?.color || colors.disabled) + '15' }]}>
                    <Text style={[styles.reading, { color: level?.color || colors.onBackground }]}>
                      Light: {v.toFixed(0)} lux
                    </Text>
                  </View>
                );
              })()}
              {device.lastReading.noiseLevel != null && (() => {
                const v = Number(device.lastReading!.noiseLevel);
                const level = NOISE_LEVELS.find(l => v >= l.min && v <= l.max);
                return (
                  <View style={[styles.readingBadge, { backgroundColor: (level?.color || colors.disabled) + '15' }]}>
                    <Text style={[styles.reading, { color: level?.color || colors.onBackground }]}>
                      Noise: {v.toFixed(1)} dB
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        )}
      </View>
    </SDACard>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons 
        name="devices" 
        size={80} 
        color={colors.disabled} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: colors.onBackground }]}>
        No Devices Yet
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.onBackground }]}>
        Add your first device to start monitoring your workspace environment
      </Text>
      <SDAButton
        title="Add Device"
        onPress={handleAddDevice}
        icon="add"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SDALoader visible={isLoading} />
      
      <View style={styles.header}>
        <SDAButton
          title="Add Device"
          onPress={handleAddDevice}
          icon="add"
          size="medium"
        />
      </View>

      {devices.length === 0 && !isLoading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={devices}
          renderItem={renderDeviceCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.MD,
    alignItems: 'flex-end',
  },
  list: {
    padding: SPACING.MD,
    paddingTop: 0,
  },
  deviceCard: {
    // Card content styles
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  deviceLocation: {
    fontSize: 14,
    opacity: 0.7,
  },
  moreButton: {
    padding: SPACING.XS / 2,
  },
  deviceStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  battery: {
    fontSize: 12,
  },
  readings: {
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  readingsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.XS,
  },
  readingItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  readingBadge: {
    borderRadius: 6,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  reading: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptyIcon: {
    marginBottom: SPACING.LG,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: SPACING.XL,
    lineHeight: 24,
  },
});