import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard, SDAButton, SDAStatusBadge } from '../../components/common';
import { useDevices } from '../../context/DevicesContext';
import { useTheme } from '../../context/ThemeContext';
import { useRealtimeReadings } from '../../hooks/useRealtimeReadings';
import { SPACING, REFRESH_INTERVALS, AQI_LEVELS, NOISE_LEVELS, LIGHT_LEVELS } from '../../constants';
import { insightsService } from '../../services/insightsService';
import { Insight } from '../../types';

export const DeviceDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { selectedDevice, devices, refreshSelectedDevice } = useDevices();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [aiTip, setAiTip] = useState<Insight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Real-time WebSocket readings — tick increments on every WS message
  const { liveReading, isConnected: wsConnected, deviceStatus, tick, reconnect } = useRealtimeReadings(selectedDevice?.id);

  // Determine the real-time device status
  const currentDeviceStatus = deviceStatus || selectedDevice?.status || 'offline';

  // Pulsing live dot animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (wsConnected && currentDeviceStatus === 'online') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [wsConnected, currentDeviceStatus]);

  // Value flash animation on new data
  const flashAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (tick > 0) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [tick]);

  // Live "X seconds ago" counter
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const lastDataTime = useRef<number>(0);
  useEffect(() => {
    if (tick > 0) {
      lastDataTime.current = Date.now();
      setSecondsAgo(0);
    }
  }, [tick]);
  useEffect(() => {
    if (!lastDataTime.current) return;
    const interval = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastDataTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live data feed — track last 15 incoming readings, fires on every WS tick
  interface LiveEntry {
    time: string;
    airQuality?: number | null;
    lightLevel?: number | null;
    noiseLevel?: number | null;
  }
  const [liveFeed, setLiveFeed] = useState<LiveEntry[]>([]);

  useEffect(() => {
    setLiveFeed([]);
  }, [selectedDevice?.id]);

  useEffect(() => {
    if (!liveReading || tick === 0) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    setLiveFeed(prev => {
      // Merge into the latest entry if within 5 seconds (same sensor batch)
      if (prev.length > 0 && prev[0].time === timeStr) {
        const merged = { ...prev[0] };
        if (liveReading.airQuality != null) merged.airQuality = liveReading.airQuality;
        if (liveReading.lightLevel != null) merged.lightLevel = liveReading.lightLevel;
        if (liveReading.noiseLevel != null) merged.noiseLevel = liveReading.noiseLevel;
        return [merged, ...prev.slice(1)].slice(0, 15);
      }
      return [{
        time: timeStr,
        airQuality: liveReading.airQuality,
        lightLevel: liveReading.lightLevel,
        noiseLevel: liveReading.noiseLevel,
      }, ...prev].slice(0, 15);
    });
  }, [tick]);

  useEffect(() => {
    if (tick > 0) {
      setLastUpdated(new Date());
    }
  }, [tick]);

  // Merge live WebSocket data with the last polled reading — tick forces recalc on every WS message
  const currentReading = useMemo(() => {
    const base = selectedDevice?.lastReading;
    if (!base && !liveReading) return null;
    return {
      airQuality: liveReading?.airQuality ?? base?.airQuality,
      lightLevel: liveReading?.lightLevel ?? base?.lightLevel,
      noiseLevel: liveReading?.noiseLevel ?? base?.noiseLevel,
      temperature: liveReading?.temperature ?? base?.temperature,
      humidity: liveReading?.humidity ?? base?.humidity,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice?.lastReading, liveReading, tick]);

  useEffect(() => {
    // Check if selected device still exists
    if (selectedDevice) {
      const deviceExists = devices.some(device => device.id === selectedDevice.id);
      if (!deviceExists) {
        navigation.goBack();
        return;
      }
    } else {
      navigation.goBack();
      return;
    }

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(async () => {
      await refreshSelectedDevice();
      setLastUpdated(new Date());
    }, REFRESH_INTERVALS.DASHBOARD);

    return () => clearInterval(interval);
  }, [selectedDevice?.id, devices, navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLiveFeed([]);
    if (reconnect) reconnect();
    await refreshSelectedDevice();
    setLastUpdated(new Date());
    setRefreshing(false);
  };

  const handleGetAITips = async () => {
    if (!selectedDevice) return;
    setAiLoading(true);
    try {
      const response = await insightsService.getAITips(selectedDevice.id);
      if (response.success && response.data) {
        setAiTip(response.data);
      }
    } catch (err) {
      console.log('AI tips not available');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReports = () => {
    navigation.navigate('ReportsTab');
  };

  const handleSettings = () => {
    navigation.navigate('AddEditDevice', { mode: 'edit', device: selectedDevice });
  };

  if (!selectedDevice) {
    return null;
  }

  const getValueInfo = (value: number, type: 'aqi' | 'noise' | 'light') => {
    let levels;
    switch (type) {
      case 'aqi':
        levels = AQI_LEVELS;
        break;
      case 'noise':
        levels = NOISE_LEVELS;
        break;
      case 'light':
        levels = LIGHT_LEVELS;
        break;
    }

    const level = levels.find(l => value >= l.min && value <= l.max);
    return { color: level?.color || colors.disabled, label: level?.label || '' };
  };

  const renderReadingCard = (
    title: string,
    value: number | undefined,
    unit: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    type?: 'aqi' | 'noise' | 'light'
  ) => {
    if (value === undefined) return null;

    const info = type ? getValueInfo(value, type) : { color: colors.primary, label: '' };

    return (
      <SDACard key={title} padding="medium">
        <View style={styles.readingCard}>
          <View style={styles.readingHeader}>
            <MaterialIcons name={icon} size={24} color={info.color} />
            <Text style={[styles.readingTitle, { color: colors.onSurface }]}>
              {title}
            </Text>
          </View>
          <View style={styles.readingContent}>
            <Text style={[styles.readingValue, { color: info.color }]}>
              {typeof value === 'number' ? value.toFixed(1) : value}
            </Text>
            <Text style={[styles.readingUnit, { color: colors.onBackground }]}>
              {unit}
            </Text>
          </View>
          {info.label ? (
            <View style={[styles.statusLabelContainer, { backgroundColor: info.color + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: info.color }]} />
              <Text style={[styles.statusLabelText, { color: info.color }]}>
                {info.label}
              </Text>
            </View>
          ) : null}
        </View>
      </SDACard>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.content}>
        {/* Device Header */}
        <SDACard padding="large">
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceName, { color: colors.onSurface }]}>
                {selectedDevice.name}
              </Text>
              <Text style={[styles.deviceLocation, { color: colors.onBackground }]}>
                {selectedDevice.location}
              </Text>
            </View>
            <SDAStatusBadge status={currentDeviceStatus} size="large" />
          </View>
          
          {selectedDevice.batteryLevel && (
            <View style={styles.batteryContainer}>
              <MaterialIcons name="battery-std" size={20} color={colors.onSurface} />
              <Text style={[styles.batteryText, { color: colors.onSurface }]}>
                Battery: {selectedDevice.batteryLevel}%
              </Text>
            </View>
          )}
        </SDACard>

        {/* Room Condition */}
        {(selectedDevice as any).roomCondition && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
              Room Condition
            </Text>
            <SDACard padding="large">
              <View style={styles.roomConditionCard}>
                <View style={[styles.scoreCircle, { borderColor: (selectedDevice as any).roomCondition.color }]}>
                  <Text style={[styles.scoreValue, { color: (selectedDevice as any).roomCondition.color }]}>
                    {(selectedDevice as any).roomCondition.score}
                  </Text>
                  <Text style={[styles.scoreLabel, { color: colors.onBackground }]}>/100</Text>
                </View>
                <Text style={[styles.conditionLabel, { color: (selectedDevice as any).roomCondition.color }]}>
                  {(selectedDevice as any).roomCondition.label}
                </Text>
              </View>
            </SDACard>
          </>
        )}

        {/* Readings Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
            {currentDeviceStatus === 'online' ? 'Live Readings' : 'Last Known Readings'}
          </Text>
          {wsConnected && currentDeviceStatus === 'online' ? (
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.liveDot, { backgroundColor: '#4CAF50', opacity: pulseAnim }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : currentDeviceStatus === 'offline' ? (
            <View style={[styles.liveIndicator, { backgroundColor: 'rgba(158,158,158,0.15)' }]}>
              <View style={[styles.liveDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={[styles.liveText, { color: '#9E9E9E' }]}>OFFLINE</Text>
            </View>
          ) : null}
        </View>

        {currentDeviceStatus === 'offline' && (
          <SDACard padding="medium">
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.XS }}>
              <MaterialIcons name="sensors-off" size={20} color={colors.warning} />
              <Text style={{ color: colors.onBackground, fontSize: 13, marginLeft: SPACING.XS, flex: 1 }}>
                Device is offline. Showing last recorded data
                {selectedDevice.lastReading?.timestamp
                  ? ` from ${new Date(selectedDevice.lastReading.timestamp).toLocaleString()}`
                  : ''}.
              </Text>
            </View>
          </SDACard>
        )}

        {currentReading ? (
          <View style={styles.readingsGrid}>
            {renderReadingCard(
              'Air Quality',
              currentReading.airQuality,
              'AQI',
              'air',
              'aqi'
            )}
            {renderReadingCard(
              'Light Level',
              currentReading.lightLevel,
              'lux',
              'wb-sunny',
              'light'
            )}
            {renderReadingCard(
              'Noise Level',
              currentReading.noiseLevel,
              'dB',
              'volume-up',
              'noise'
            )}
            {/* Flash overlay on new data — only when online */}
            {currentDeviceStatus === 'online' && (
              <Animated.View
                pointerEvents="none"
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: colors.primary,
                  opacity: flashAnim,
                  borderRadius: 12,
                }}
              />
            )}
          </View>
        ) : (
          <SDACard padding="large">
            <View style={{ alignItems: 'center', paddingVertical: SPACING.LG }}>
              <MaterialIcons name="sensors-off" size={48} color={colors.disabled} />
              <Text style={{ color: colors.onBackground, fontSize: 16, fontWeight: '600', marginTop: SPACING.MD }}>
                No Readings Available
              </Text>
            </View>
          </SDACard>
        )}

        {/* AI Tips */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          AI Tips
        </Text>

        <SDACard padding="medium">
          {aiTip ? (
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
                <View style={[styles.insightBadge, { backgroundColor: colors.info }]}>
                  <Text style={styles.insightBadgeText}>AI</Text>
                </View>
              </View>
              <Text style={[styles.insightTitle, { color: colors.onSurface }]}>
                {aiTip.title}
              </Text>
              <Text style={[styles.insightDescription, { color: colors.onBackground }]}>
                {aiTip.description}
              </Text>
              {aiTip.actions && aiTip.actions.length > 0 && (
                <View style={{ marginTop: SPACING.XS }}>
                  {aiTip.actions.map((action, i) => (
                    <Text key={i} style={{ color: colors.onBackground, fontSize: 13 }}>
                      {'\u2022'} {action}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: SPACING.MD }}>
              <MaterialIcons name="auto-awesome" size={32} color={colors.disabled} />
              <Text style={{ color: colors.onBackground, marginTop: SPACING.SM, fontSize: 14 }}>
                Get AI-powered tips for your workspace
              </Text>
            </View>
          )}
          <SDAButton
            title={aiLoading ? 'Analyzing...' : 'Get AI Tips'}
            onPress={handleGetAITips}
            loading={aiLoading}
            variant="outlined"
            size="small"
            icon="auto-awesome"
          />
        </SDACard>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Quick Actions
        </Text>

        <View style={styles.actionsContainer}>
          <SDAButton
            title="View Reports"
            onPress={handleReports}
            icon="analytics"
            variant="outlined"
            fullWidth
          />
          <SDAButton
            title="Device Settings"
            onPress={handleSettings}
            icon="settings"
            variant="outlined"
            fullWidth
          />
        </View>

        {/* Live Data Feed */}
        {liveFeed.length > 0 && currentDeviceStatus === 'online' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                Live Data Feed
              </Text>
              <View style={styles.liveIndicator}>
                <Animated.View style={[styles.liveDot, { backgroundColor: colors.success, opacity: pulseAnim }]} />
                <Text style={[styles.liveText, { color: colors.success }]}>STREAMING</Text>
              </View>
            </View>

            <SDACard padding="small">
              {/* Table Header */}
              <View style={styles.feedHeader}>
                <Text style={[styles.feedHeaderText, { color: colors.onBackground, flex: 0.3 }]}>Time</Text>
                <Text style={[styles.feedHeaderText, { color: colors.onBackground, flex: 0.23, textAlign: 'right' }]}>AQI</Text>
                <Text style={[styles.feedHeaderText, { color: colors.onBackground, flex: 0.24, textAlign: 'right' }]}>Light</Text>
                <Text style={[styles.feedHeaderText, { color: colors.onBackground, flex: 0.23, textAlign: 'right' }]}>Noise</Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.disabled + '30', marginBottom: 4 }} />

              {liveFeed.map((entry, i) => (
                <View
                  key={i}
                  style={[
                    styles.feedRow,
                    i === 0 && { backgroundColor: colors.success + '10' },
                    i % 2 === 0 && i !== 0 && { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.feedTime, { color: colors.onBackground, flex: 0.3 }]}>
                    {entry.time}
                  </Text>
                  <Text style={[styles.feedValue, {
                    flex: 0.23, textAlign: 'right',
                    color: entry.airQuality != null
                      ? (AQI_LEVELS.find(l => entry.airQuality! >= l.min && entry.airQuality! <= l.max)?.color || colors.onSurface)
                      : colors.disabled,
                  }]}>
                    {entry.airQuality != null ? Number(entry.airQuality).toFixed(1) : '—'}
                  </Text>
                  <Text style={[styles.feedValue, {
                    flex: 0.24, textAlign: 'right',
                    color: entry.lightLevel != null
                      ? (LIGHT_LEVELS.find(l => entry.lightLevel! >= l.min && entry.lightLevel! <= l.max)?.color || colors.onSurface)
                      : colors.disabled,
                  }]}>
                    {entry.lightLevel != null ? Number(entry.lightLevel).toFixed(0) : '—'}
                  </Text>
                  <Text style={[styles.feedValue, {
                    flex: 0.23, textAlign: 'right',
                    color: entry.noiseLevel != null
                      ? (NOISE_LEVELS.find(l => entry.noiseLevel! >= l.min && entry.noiseLevel! <= l.max)?.color || colors.onSurface)
                      : colors.disabled,
                  }]}>
                    {entry.noiseLevel != null ? Number(entry.noiseLevel).toFixed(1) : '—'}
                  </Text>
                </View>
              ))}
            </SDACard>
          </>
        )}

        <View style={styles.refreshInfo}>
          <Text style={[styles.refreshText, { color: colors.onBackground }]}>
            {currentDeviceStatus === 'offline'
              ? selectedDevice.lastReading?.timestamp
                ? `Last reading: ${new Date(selectedDevice.lastReading.timestamp).toLocaleString()}`
                : 'No readings recorded'
              : secondsAgo !== null
                ? secondsAgo < 3
                  ? 'Updated just now'
                  : `Updated ${secondsAgo}s ago`
                : `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </Text>
          <Text style={[styles.refreshText, { color: currentDeviceStatus === 'offline' ? colors.error : wsConnected ? colors.success : colors.onBackground }]}>
            {currentDeviceStatus === 'offline'
              ? 'Device is offline — sensor powered off'
              : wsConnected ? 'Real-time WebSocket connected' : 'Polling every 30 seconds'}
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: SPACING.XS / 2,
  },
  deviceLocation: {
    fontSize: 14,
    opacity: 0.7,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  batteryText: {
    fontSize: 14,
    marginLeft: SPACING.XS,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  liveText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  readingsGrid: {
    gap: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  readingCard: {
    // Reading card styles
  },
  readingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  readingTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: SPACING.XS,
  },
  readingContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.XS,
  },
  readingValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  readingUnit: {
    fontSize: 14,
    marginLeft: SPACING.XS,
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: SPACING.XS,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },
  statusLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightCard: {
    // Insight card styles
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  insightBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: SPACING.XS,
    paddingVertical: SPACING.XS / 2,
    borderRadius: 4,
  },
  insightBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  feedHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.XS,
  },
  feedHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: SPACING.XS,
    borderRadius: 4,
  },
  feedTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  feedValue: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  refreshInfo: {
    alignItems: 'center',
    marginTop: SPACING.LG,
  },
  refreshText: {
    fontSize: 12,
    opacity: 0.7,
  },
  roomConditionCard: {
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  conditionLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
});
