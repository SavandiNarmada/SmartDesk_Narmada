import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard, SDAButton } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, SCREEN_NAMES } from '../../constants';
import { Insight } from '../../types';
import { insightsService } from '../../services/insightsService';

export const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'warning' | 'critical' | 'ai'>('all');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      setError(null);
      const response = await insightsService.getInsights();
      if (response.success) {
        setInsights(response.data || []);
      } else {
        setError('Failed to load insights');
      }
    } catch (err) {
      setError('Failed to load insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInsights();
    setRefreshing(false);
  };

  // Mock insights data (fallback)
  const mockInsights: Insight[] = [
    {
      id: '1',
      deviceId: '1',
      type: 'air_quality',
      title: 'Poor Air Quality Detected',
      description: 'Air quality levels have been consistently high for the past 2 hours. Consider improving ventilation or using an air purifier.',
      severity: 'critical',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      actionable: true,
      actions: ['Open windows', 'Turn on air purifier', 'Check HVAC filter'],
    },
    {
      id: '2',
      deviceId: '1',
      type: 'lighting',
      title: 'Optimal Lighting Conditions',
      description: 'Your workspace lighting is in the optimal range for productivity. Current levels support focused work.',
      severity: 'info',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      actionable: false,
    },
    {
      id: '3',
      deviceId: '1',
      type: 'noise',
      title: 'Elevated Noise Levels',
      description: 'Noise levels have increased during your focus time. This may impact concentration and productivity.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      actionable: true,
      actions: ['Use noise-canceling headphones', 'Close door', 'Move to quieter space'],
    },
    {
      id: '4',
      deviceId: '1',
      type: 'productivity',
      title: 'Workspace Optimization Suggestion',
      description: 'Based on your patterns, adjusting temperature and lighting could improve your afternoon productivity by 15%.',
      severity: 'info',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      actionable: true,
      actions: ['Adjust thermostat', 'Increase lighting', 'Take break'],
    },
  ];

  const getCurrentInsights = () => {
    return insights.length > 0 ? insights : mockInsights;
  };

  const filteredInsights = getCurrentInsights().filter(insight => {
    if (filter === 'all') return true;
    if (filter === 'ai') return insight.source === 'ai' || insight.type === 'ai_recommendation';
    return insight.severity === filter;
  });

  const latestInsight = getCurrentInsights()[0];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'air_quality': return 'air';
      case 'lighting': return 'wb-sunny';
      case 'noise': return 'volume-up';
      case 'productivity': return 'trending-up';
      case 'health': return 'favorite';
      case 'ai_recommendation': return 'auto-awesome';
      default: return 'lightbulb';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return colors.error;
      case 'warning': return colors.warning;
      case 'info': return colors.info;
      default: return colors.disabled;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'CRITICAL';
      case 'warning': return 'WARNING';
      case 'info': return 'INFO';
      default: return 'UNKNOWN';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  const renderInsightCard = ({ item: insight }: { item: Insight }) => (
    <SDACard padding="medium" onPress={() => navigation.navigate(SCREEN_NAMES.INSIGHT_DETAILS, { insight })}>
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.insightTitleContainer}>
            <MaterialIcons 
              name={getInsightIcon(insight.type) as any} 
              size={24} 
              color={getSeverityColor(insight.severity)} 
            />
            <Text style={[styles.insightTitle, { color: colors.onSurface }]}>
              {insight.title}
            </Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(insight.severity) }]}>
            <Text style={styles.severityText}>
              {getSeverityBadge(insight.severity)}
            </Text>
          </View>
          {(insight.source === 'ai' || insight.type === 'ai_recommendation') && (
            <MaterialIcons name="auto-awesome" size={16} color={colors.primary} style={{ marginLeft: SPACING.XS }} />
          )}
        </View>

        <Text style={[styles.insightDescription, { color: colors.onBackground }]}>
          {insight.description}
        </Text>

        {insight.actionable && insight.actions && (
          <View style={styles.actionsContainer}>
            <Text style={[styles.actionsTitle, { color: colors.onSurface }]}>
              Suggested Actions:
            </Text>
            {insight.actions.map((action, index) => (
              <View key={index} style={styles.actionItem}>
                <Text style={[styles.actionBullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.actionText, { color: colors.onBackground }]}>
                  {action}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.timestamp, { color: colors.onBackground }]}>
          {formatTimeAgo(insight.timestamp)}
        </Text>
      </View>
    </SDACard>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.onBackground }]}>
                Loading insights...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
              <SDAButton
                title="Retry"
                onPress={fetchInsights}
                variant="primary"
                size="small"
              />
            </View>
          ) : (
            <>
              {/* Latest Insight */}
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                Latest Insight
              </Text>

              <SDACard padding="large" elevation={2}>
                <View style={styles.latestInsight}>
                  <View style={styles.latestHeader}>
                    <MaterialIcons 
                      name={getInsightIcon(latestInsight.type) as any} 
                      size={32} 
                      color={getSeverityColor(latestInsight.severity)} 
                    />
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(latestInsight.severity) }]}>
                      <Text style={styles.severityText}>
                        {getSeverityBadge(latestInsight.severity)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.latestTitle, { color: colors.onSurface }]}>
                    {latestInsight.title}
                  </Text>
                  
                  <Text style={[styles.latestDescription, { color: colors.onBackground }]}>
                    {latestInsight.description}
                  </Text>

                  <SDAButton
                    title="Take Action"
                    onPress={() => console.log('Take action')}
                    fullWidth
                    size="medium"
                  />
                </View>
              </SDACard>

              {/* Filter Options */}
              <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                Insights History
              </Text>

              <View style={styles.filterContainer}>
                <SDAButton
                  title="All"
                  onPress={() => setFilter('all')}
                  variant={filter === 'all' ? 'primary' : 'outlined'}
                  size="small"
                />
                <SDAButton
                  title="Warnings"
                  onPress={() => setFilter('warning')}
                  variant={filter === 'warning' ? 'primary' : 'outlined'}
                  size="small"
                />
                <SDAButton
                  title="Critical"
                  onPress={() => setFilter('critical')}
                  variant={filter === 'critical' ? 'primary' : 'outlined'}
                  size="small"
                />
                <SDAButton
                  title="AI Tips"
                  onPress={() => setFilter('ai')}
                  variant={filter === 'ai' ? 'primary' : 'outlined'}
                  size="small"
                />
              </View>

              {/* Insights List */}
              {filteredInsights.length === 0 ? (
                <SDACard padding="large">
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="lightbulb-outline" size={48} color={colors.disabled} />
                    <Text style={[styles.emptyText, { color: colors.onBackground }]}>
                      No insights found
                    </Text>
                  </View>
                </SDACard>
              ) : (
                <FlatList
                  data={filteredInsights}
                  renderItem={renderInsightCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: SPACING.MD }} />}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.MD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
    marginTop: SPACING.LG,
  },
  latestInsight: {
    alignItems: 'center',
  },
  latestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.MD,
  },
  latestTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  latestDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.LG,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  insightCard: {
    // Insight card styles
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  insightTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.XS,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: SPACING.XS,
    paddingVertical: SPACING.XS / 2,
    borderRadius: 4,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },
  actionsContainer: {
    marginBottom: SPACING.SM,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.XS,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.XS / 2,
  },
  actionBullet: {
    fontSize: 16,
    marginRight: SPACING.XS,
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 14,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: SPACING.XS,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XL * 2,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.XL * 2,
  },
  errorText: {
    fontSize: 16,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL,
  },
  emptyText: {
    fontSize: 16,
    marginTop: SPACING.MD,
    textAlign: 'center',
    opacity: 0.7,
  },
});