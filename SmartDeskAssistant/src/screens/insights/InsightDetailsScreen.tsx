import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SDACard } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants';
import { Insight, InsightSeverity, InsightType } from '../../types';

type InsightDetailsRouteParams = {
  InsightDetails: { insight: Insight; deviceName?: string };
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSeverityColor(severity: InsightSeverity): string {
  switch (severity) {
    case 'critical': return '#F44336';
    case 'warning':  return '#FF9800';
    default:         return '#2196F3';
  }
}

function getSeverityIcon(severity: InsightSeverity): string {
  switch (severity) {
    case 'critical': return 'error';
    case 'warning':  return 'warning';
    default:         return 'info';
  }
}

function getTypeIcon(type: InsightType): string {
  switch (type) {
    case 'air_quality':  return 'air';
    case 'lighting':     return 'wb-sunny';
    case 'noise':        return 'volume-up';
    case 'productivity': return 'trending-up';
    case 'health':       return 'favorite';
    default:             return 'lightbulb';
  }
}

function getTypeLabel(type: InsightType): string {
  switch (type) {
    case 'air_quality':  return 'Air Quality';
    case 'lighting':     return 'Lighting';
    case 'noise':        return 'Noise';
    case 'productivity': return 'Productivity';
    case 'health':       return 'Health';
    default:             return type;
  }
}

export const InsightDetailsScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<InsightDetailsRouteParams, 'InsightDetails'>>();
  const { insight, deviceName } = route.params || ({} as any);

  if (!insight) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <MaterialIcons name="lightbulb-outline" size={64} color={colors.disabled} />
        <Text style={[styles.emptyText, { color: colors.onBackground }]}>
          No insight data available.
        </Text>
      </View>
    );
  }

  const severityColor = getSeverityColor(insight.severity);
  const severityIcon  = getSeverityIcon(insight.severity);
  const typeIcon      = getTypeIcon(insight.type);
  const typeLabel     = getTypeLabel(insight.type);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Severity Banner */}
      <View style={[styles.severityBanner, { backgroundColor: severityColor }]}>
        <MaterialIcons name={severityIcon as any} size={32} color="#FFFFFF" />
        <Text style={styles.severityLabel}>
          {insight.severity.toUpperCase()}
        </Text>
      </View>

      {/* Title Card */}
      <SDACard style={styles.card}>
        <View style={styles.titleRow}>
          <MaterialIcons name={typeIcon as any} size={24} color={severityColor} />
          <Text style={[styles.typeLabel, { color: severityColor }]}>
            {typeLabel}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          {insight.title}
        </Text>
        {deviceName ? (
          <View style={styles.deviceRow}>
            <MaterialIcons name="devices" size={16} color={colors.disabled} />
            <Text style={[styles.deviceName, { color: colors.disabled }]}>
              {deviceName}
            </Text>
          </View>
        ) : null}
        <View style={styles.timestampRow}>
          <MaterialIcons name="schedule" size={14} color={colors.disabled} />
          <Text style={[styles.timestamp, { color: colors.disabled }]}>
            {formatTimestamp(insight.timestamp)}
          </Text>
        </View>
      </SDACard>

      {/* Description Card */}
      <SDACard style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Description
        </Text>
        <Text style={[styles.description, { color: colors.onBackground }]}>
          {insight.description}
        </Text>
      </SDACard>

      {/* Recommended Actions */}
      {insight.actionable && insight.actions && insight.actions.length > 0 ? (
        <SDACard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Recommended Actions
          </Text>
          {insight.actions.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <View style={[styles.actionNumber, { backgroundColor: severityColor }]}>
                <Text style={styles.actionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.actionText, { color: colors.onBackground }]}>
                {action}
              </Text>
            </View>
          ))}
        </SDACard>
      ) : null}

      {/* Insight Meta */}
      <SDACard style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Details
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.disabled }]}>Category</Text>
          <Text style={[styles.metaValue, { color: colors.onSurface }]}>{typeLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.disabled }]}>Severity</Text>
          <View style={[styles.severityChip, { backgroundColor: severityColor }]}>
            <Text style={styles.severityChipText}>
              {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: colors.disabled }]}>Actionable</Text>
          <Text style={[styles.metaValue, { color: colors.onSurface }]}>
            {insight.actionable ? 'Yes' : 'No'}
          </Text>
        </View>
      </SDACard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: SPACING.XL,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  emptyText: {
    fontSize: 16,
    marginTop: SPACING.MD,
    textAlign: 'center',
    opacity: 0.7,
  },
  severityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.LG,
    gap: SPACING.SM,
  },
  severityLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    gap: SPACING.XS,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: SPACING.SM,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    marginBottom: SPACING.XS,
  },
  deviceName: {
    fontSize: 13,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  timestamp: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  actionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  actionNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.XS,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  metaLabel: {
    fontSize: 14,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  severityChip: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
