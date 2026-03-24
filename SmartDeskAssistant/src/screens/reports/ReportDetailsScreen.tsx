import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard, SDAButton } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TIME_RANGES } from '../../constants';
import { insightsService, ReportData, RecentReading } from '../../services/insightsService';

const screenWidth = Dimensions.get('window').width;

type Metric = 'air_quality' | 'light_level' | 'noise_level' | 'temperature' | 'humidity';

type ReportDetailsRouteParams = {
  ReportDetails: {
    metric: Metric;
    timeRange: string;
    reportData?: ReportData;
    stats?: { average: number; min: number; max: number; count: number };
    metricName?: string;
    unit?: string;
  };
};

function getMetricColor(metric: Metric): string {
  switch (metric) {
    case 'air_quality':  return 'rgba(46, 125, 50, 1)';   // Deep green
    case 'light_level':  return 'rgba(245, 124, 0, 1)';   // Deep orange
    case 'noise_level':  return 'rgba(21, 101, 192, 1)';  // Deep blue
    case 'temperature':  return 'rgba(211, 47, 47, 1)';   // Red
    case 'humidity':     return 'rgba(123, 31, 162, 1)';   // Purple
    default:             return 'rgba(158, 158, 158, 1)';
  }
}

function getMetricIcon(metric: Metric): string {
  switch (metric) {
    case 'air_quality':  return 'air';
    case 'light_level':  return 'wb-sunny';
    case 'noise_level':  return 'volume-up';
    case 'temperature':  return 'thermostat';
    case 'humidity':     return 'water-drop';
    default:             return 'analytics';
  }
}

export const ReportDetailsScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<ReportDetailsRouteParams, 'ReportDetails'>>();
  const navigation = useNavigation<any>();

  const {
    metric = 'air_quality',
    timeRange: initialTimeRange = '24h',
    reportData: initialData,
    stats: initialStats,
    metricName = 'Air Quality',
    unit = 'PPM',
  } = route.params || ({} as any);

  const [selectedTimeRange, setSelectedTimeRange] = useState(initialTimeRange);
  const [reportData, setReportData] = useState<ReportData | null>(initialData || null);
  const [stats, setStats] = useState(initialStats || null);
  const [recentReadings, setRecentReadings] = useState<RecentReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (tr: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await insightsService.getReports(tr, metric);
      if (response.success && response.data) {
        setReportData(response.data);
        setStats(response.data.stats);
        setRecentReadings(response.data.recentReadings || []);
      } else {
        setError('Failed to load report data');
      }
    } catch {
      setError('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTimeRange);
  }, [selectedTimeRange]);

  const currentColor = getMetricColor(metric);
  const metricIcon  = getMetricIcon(metric);

  const chartData = reportData && reportData.datasets.length > 0
    ? {
        labels: reportData.labels,
        datasets: [{ data: reportData.datasets[0].data, color: () => currentColor, strokeWidth: 2 }],
      }
    : null;

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => currentColor.replace('1)', `${opacity})`),
    labelColor: (opacity = 1) => colors.onBackground + Math.round(opacity * 255).toString(16).padStart(2, '0'),
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: currentColor },
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name={metricIcon as any} size={32} color={currentColor} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
              {metricName}
            </Text>
            <Text style={[styles.headerSub, { color: colors.disabled }]}>
              Detailed trend analysis
            </Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {TIME_RANGES.map((range) => (
            <SDAButton
              key={range.value}
              title={range.label}
              onPress={() => setSelectedTimeRange(range.value)}
              variant={selectedTimeRange === range.value ? 'primary' : 'outlined'}
              size="small"
            />
          ))}
        </View>

        {/* Chart */}
        <SDACard title={`${metricName} Over Time`} padding="medium">
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.onBackground }]}>
                Loading data…
              </Text>
            </View>
          ) : error ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="error-outline" size={48} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <SDAButton title="Retry" onPress={() => fetchData(selectedTimeRange)} variant="primary" size="small" />
            </View>
          ) : !chartData || chartData.labels.length === 0 ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="bar-chart" size={48} color={colors.disabled} />
              <Text style={[styles.emptyText, { color: colors.onBackground }]}>
                No data for this time range
              </Text>
            </View>
          ) : (
            <LineChart
              data={chartData}
              width={screenWidth - SPACING.MD * 4}
              height={260}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLines={false}
              segments={5}
            />
          )}
        </SDACard>

        {/* Statistics */}
        {stats ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
              Statistics
            </Text>
            <View style={styles.statsGrid}>
              <SDACard padding="medium" style={styles.statCard}>
                <MaterialIcons name="show-chart" size={22} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.average.toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.disabled }]}>Average</Text>
                <Text style={[styles.statUnit, { color: colors.disabled }]}>{unit}</Text>
              </SDACard>

              <SDACard padding="medium" style={styles.statCard}>
                <MaterialIcons name="arrow-downward" size={22} color={colors.secondary} />
                <Text style={[styles.statValue, { color: colors.secondary }]}>
                  {stats.min.toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.disabled }]}>Minimum</Text>
                <Text style={[styles.statUnit, { color: colors.disabled }]}>{unit}</Text>
              </SDACard>

              <SDACard padding="medium" style={styles.statCard}>
                <MaterialIcons name="arrow-upward" size={22} color={colors.error} />
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {stats.max.toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.disabled }]}>Maximum</Text>
                <Text style={[styles.statUnit, { color: colors.disabled }]}>{unit}</Text>
              </SDACard>

              <SDACard padding="medium" style={styles.statCard}>
                <MaterialIcons name="data-usage" size={22} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {stats.count}
                </Text>
                <Text style={[styles.statLabel, { color: colors.disabled }]}>Readings</Text>
                <Text style={[styles.statUnit, { color: colors.disabled }]}>points</Text>
              </SDACard>
            </View>

            {/* Range bar */}
            <SDACard padding="medium">
              <Text style={[styles.rangeTitle, { color: colors.onSurface }]}>Value Range</Text>
              <View style={styles.rangeRow}>
                <Text style={[styles.rangeLabel, { color: colors.disabled }]}>
                  {stats.min.toFixed(1)} {unit}
                </Text>
                <View style={styles.rangeBarContainer}>
                  <View style={[styles.rangeBarBg, { backgroundColor: colors.disabled + '40' }]}>
                    <View
                      style={[
                        styles.rangeBarFill,
                        {
                          backgroundColor: currentColor,
                          left: '0%',
                          width: '100%',
                        },
                      ]}
                    />
                    {/* Avg marker */}
                    {stats.max - stats.min > 0.01 ? (
                      <View
                        style={[
                          styles.avgMarker,
                          {
                            left: `${Math.min(100, Math.max(0, ((stats.average - stats.min) / (stats.max - stats.min)) * 100))}%`,
                            backgroundColor: colors.onSurface,
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.rangeLabel, { color: colors.disabled }]}>
                  {stats.max.toFixed(1)} {unit}
                </Text>
              </View>
              <Text style={[styles.avgLabel, { color: colors.onBackground }]}>
                Average: {stats.average.toFixed(1)} {unit}
              </Text>
            </SDACard>
          </>
        ) : null}

        {/* Recent Readings Table — only for 1H and 24H */}
        {(selectedTimeRange === '1h' || selectedTimeRange === '24h') && recentReadings.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
              Recent Readings
            </Text>
            <SDACard padding="medium">
              {/* Table Header */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableHeaderText, { color: colors.onSurface, flex: 0.15 }]}>#</Text>
                <Text style={[styles.tableHeaderText, { color: colors.onSurface, flex: 0.5 }]}>Time</Text>
                <Text style={[styles.tableHeaderText, { color: colors.onSurface, flex: 0.35, textAlign: 'right' }]}>
                  Value ({unit})
                </Text>
              </View>
              <View style={[styles.tableDivider, { backgroundColor: colors.disabled + '40' }]} />
              {/* Table Rows */}
              {recentReadings.map((reading, index) => {
                const date = new Date(reading.timestamp);
                const timeStr = date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                });
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <View key={index}>
                    <View style={[styles.tableRow, index % 2 === 0 && { backgroundColor: colors.surface }]}>
                      <Text style={[styles.tableCell, { color: colors.disabled, flex: 0.15 }]}>
                        {index + 1}
                      </Text>
                      <View style={{ flex: 0.5 }}>
                        <Text style={[styles.tableCell, { color: colors.onBackground }]}>
                          {timeStr}
                        </Text>
                        <Text style={[styles.tableDateText, { color: colors.disabled }]}>
                          {dateStr}
                        </Text>
                      </View>
                      <Text style={[styles.tableCell, { color: currentColor, flex: 0.35, textAlign: 'right', fontWeight: '600' }]}>
                        {reading.value.toFixed(1)}
                      </Text>
                    </View>
                    {index < recentReadings.length - 1 && (
                      <View style={[styles.tableDivider, { backgroundColor: colors.disabled + '20' }]} />
                    )}
                  </View>
                );
              })}
            </SDACard>
          </>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.disabled }]}>
            Showing data for the last {TIME_RANGES.find(r => r.value === selectedTimeRange)?.label}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.MD, paddingBottom: SPACING.XL },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.LG,
    gap: SPACING.MD,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
    justifyContent: 'space-around',
  },
  chart: { marginVertical: SPACING.SM, borderRadius: 16 },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    gap: SPACING.SM,
  },
  loadingText: { marginTop: SPACING.SM, fontSize: 15 },
  errorText: { fontSize: 15, textAlign: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center', opacity: 0.7 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', marginTop: SPACING.XS },
  statLabel: { fontSize: 12 },
  statUnit: { fontSize: 11 },
  rangeTitle: { fontSize: 15, fontWeight: '600', marginBottom: SPACING.SM },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  rangeLabel: { fontSize: 12, width: 60 },
  rangeBarContainer: { flex: 1 },
  rangeBarBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  rangeBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  avgMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 1.5,
  },
  avgLabel: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.XS,
  },
  tableHeader: {
    paddingBottom: SPACING.SM,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    fontSize: 14,
  },
  tableDateText: {
    fontSize: 11,
    marginTop: 1,
  },
  tableDivider: {
    height: 1,
  },
  footer: { alignItems: 'center', marginTop: SPACING.LG },
  footerText: { fontSize: 12 },
});
