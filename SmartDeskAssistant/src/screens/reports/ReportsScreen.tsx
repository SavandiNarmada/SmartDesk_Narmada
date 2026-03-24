import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { SDACard, SDAButton } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TIME_RANGES, SCREEN_NAMES } from '../../constants';
import { insightsService, ReportData } from '../../services/insightsService';

const screenWidth = Dimensions.get('window').width;

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [selectedTab, setSelectedTab] = useState<'air_quality' | 'light_level' | 'noise_level'>('air_quality');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await insightsService.getReports(selectedTimeRange, selectedTab);
      if (response.success) {
        setReportData(response.data || null);
      } else {
        setError('Failed to load report data');
      }
    } catch (err) {
      setError('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedTab, selectedTimeRange]);

  const mockData = {
    air_quality: {
      labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
      datasets: [{
        data: [45, 52, 48, 61, 58, 42],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      }]
    },
    light_level: {
      labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
      datasets: [{
        data: [120, 850, 950, 420, 200, 50],
        color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
        strokeWidth: 2,
      }]
    },
    noise_level: {
      labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
      datasets: [{
        data: [35, 42, 45, 52, 48, 38],
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2,
      }]
    }
  };



  const getMetricName = (metric: string) => {
    switch (metric) {
      case 'air_quality': return 'Air Quality (PPM)';
      case 'light_level': return 'Light Level (Lux)';
      case 'noise_level': return 'Noise Level (dB)';
      default: return metric;
    }
  };

  const getCurrentData = () => {
    if (reportData) {
      return reportData;
    }
    // Fallback to mock data if API fails
    return mockData[selectedTab as keyof typeof mockData] || mockData.air_quality;
  };

  const currentData = getCurrentData();

  const getMetricChartColor = () => {
    switch (selectedTab) {
      case 'air_quality':  return '#2E7D32';
      case 'light_level':  return '#F57C00';
      case 'noise_level':  return '#1565C0';
      default: return colors.primary;
    }
  };
  const metricChartColor = getMetricChartColor();

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
    labelColor: () => colors.onBackground,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "4",
      strokeWidth: "1.5",
      stroke: metricChartColor,
    }
  };

  const getTabTitle = () => {
    switch (selectedTab) {
      case 'air_quality': return 'Air Quality';
      case 'light_level': return 'Light Level';
      case 'noise_level': return 'Noise Level';
    }
  };

  const getTabUnit = () => {
    switch (selectedTab) {
      case 'air_quality': return 'PPM';
      case 'light_level': return 'lux';
      case 'noise_level': return 'dB';
    }
  };

  const getStats = () => {
    if (reportData?.stats) {
      return reportData.stats;
    }
    // Fallback to mock data calculations
    const data = currentData.datasets.length > 0 ? currentData.datasets[0].data : [];
    if (data.length === 0) return { average: 0, min: 0, max: 0, count: 0 };
    return {
      average: data.reduce((a, b) => a + b, 0) / data.length,
      min: Math.min(...data),
      max: Math.max(...data),
      count: data.length
    };
  };

  const stats = getStats();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
          pagingEnabled={false}
        >
          <View style={styles.tabButton}>
            <SDAButton
              title="Air Quality"
              onPress={() => setSelectedTab('air_quality')}
              variant={selectedTab === 'air_quality' ? 'primary' : 'outlined'}
              size="large"
              fullWidth
            />
          </View>
          <View style={styles.tabButton}>
            <SDAButton
              title="Light Level"
              onPress={() => setSelectedTab('light_level')}
              variant={selectedTab === 'light_level' ? 'primary' : 'outlined'}
              size="large"
              fullWidth
            />
          </View>
          <View style={styles.tabButton}>
            <SDAButton
              title="Noise Level"
              onPress={() => setSelectedTab('noise_level')}
              variant={selectedTab === 'noise_level' ? 'primary' : 'outlined'}
              size="large"
              fullWidth
            />
          </View>
        </ScrollView>

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
        <SDACard title={`${getTabTitle()} Trends`} padding="medium">
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.onBackground }]}>
                Loading data...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
              <SDAButton
                title="Retry"
                onPress={fetchReportData}
                variant="primary"
                size="small"
              />
            </View>
          ) : currentData.labels.length === 0 || currentData.datasets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.onBackground }]}>
                No data available for the selected time range
              </Text>
            </View>
          ) : (
            <LineChart
              data={currentData}
              width={screenWidth - (SPACING.MD * 4)} // Adjust for card padding
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          )}
        </SDACard>

        {/* Summary Statistics */}
        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
          Summary Statistics
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statWrapper}>
            <SDACard padding="medium">
              <View style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.onBackground }]}>
                  Average
                </Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.average.toFixed(1)} {getTabUnit()}
                </Text>
              </View>
            </SDACard>
          </View>

          <View style={styles.statWrapper}>
            <SDACard padding="medium">
              <View style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.onBackground }]}>
                  Minimum
                </Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {stats.min.toFixed(1)} {getTabUnit()}
                </Text>
              </View>
            </SDACard>
          </View>

          <View style={styles.statWrapper}>
            <SDACard padding="medium">
              <View style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.onBackground }]}>
                  Maximum
                </Text>
                <Text style={[styles.statValue, { color: colors.error }]}>
                  {stats.max.toFixed(1)} {getTabUnit()}
                </Text>
              </View>
            </SDACard>
          </View>
        </View>

        {/* View Details */}
        <SDAButton
          title="View Detailed Report"
          onPress={() => navigation.navigate(SCREEN_NAMES.REPORT_DETAILS, {
            metric: selectedTab,
            timeRange: selectedTimeRange,
            reportData: currentData,
            stats,
            metricName: getMetricName(selectedTab),
            unit: getTabUnit(),
          })}
          icon="open-in-new"
          variant="outlined"
          fullWidth
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.onBackground }]}>
            Data from the last {TIME_RANGES.find(r => r.value === selectedTimeRange)?.label}
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
  tabContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
    paddingRight: SPACING.MD,
  },
  tabButton: {
    width: screenWidth * 0.65,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
    justifyContent: 'space-around',
  },
  chart: {
    marginVertical: SPACING.SM,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  statWrapper: {
    flex: 1,
  },
  statCard: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: SPACING.XS,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.LG,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  errorText: {
    fontSize: 16,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});