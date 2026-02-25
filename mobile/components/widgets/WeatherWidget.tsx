import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

interface ForecastItem {
  time: string;
  temp: number;
  condition: string;
}

interface Props {
  phase: WidgetPhase;
  data: {
    location?: string;
    temperature?: number;
    condition?: string;
    humidity?: number;
    wind?: string;
    high?: number;
    low?: number;
    forecast?: ForecastItem[];
  };
  onDismiss: () => void;
}

const conditionLabel: Record<string, string> = {
  sunny: 'Clear',
  cloudy: 'Cloudy',
  'partly cloudy': 'Partly Cloudy',
  clear: 'Clear Night',
  rainy: 'Rain',
  stormy: 'Storm',
  snowy: 'Snow',
};

export default function WeatherWidget({ phase, data, onDismiss }: Props) {
  return (
    <WidgetShell
      title="Weather"
      subtitle={data.location || 'Current Location'}
      phase={phase}
      searchingLabel="Checking conditions"
      onDismiss={onDismiss}
    >
      <ActiveView data={data} onDismiss={onDismiss} />
    </WidgetShell>
  );
}

function ActiveView({ data, onDismiss }: { data: Props['data']; onDismiss: () => void }) {
  return (
    <View>
      {/* Temperature */}
      <View style={s.tempBlock}>
        <Text style={s.tempValue}>{data.temperature ?? '--'}°</Text>
        <Text style={s.conditionText}>{data.condition || 'Unknown'}</Text>
      </View>

      {/* Details */}
      <View style={s.detailsRow}>
        <View style={s.detail}>
          <Text style={s.detailLabel}>HIGH</Text>
          <Text style={s.detailValue}>{data.high ?? '--'}°</Text>
        </View>
        <View style={s.detailDivider} />
        <View style={s.detail}>
          <Text style={s.detailLabel}>LOW</Text>
          <Text style={s.detailValue}>{data.low ?? '--'}°</Text>
        </View>
        <View style={s.detailDivider} />
        <View style={s.detail}>
          <Text style={s.detailLabel}>HUMIDITY</Text>
          <Text style={s.detailValue}>{data.humidity ?? '--'}%</Text>
        </View>
        <View style={s.detailDivider} />
        <View style={s.detail}>
          <Text style={s.detailLabel}>WIND</Text>
          <Text style={s.detailValue}>{data.wind ?? '--'}</Text>
        </View>
      </View>

      {/* Forecast */}
      {data.forecast && data.forecast.length > 0 && (
        <View style={s.forecastRow}>
          {data.forecast.map((item, i) => (
            <View key={i} style={s.forecastItem}>
              <Text style={s.forecastTime}>{item.time}</Text>
              <Text style={s.forecastTemp}>{item.temp}°</Text>
              <Text style={s.forecastCond}>{conditionLabel[item.condition] || item.condition}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tempBlock: {
    alignItems: 'center',
    marginBottom: T.s5,
  },
  tempValue: {
    color: T.textPrimary,
    fontSize: T.font4xl,
    fontWeight: T.thin,
    letterSpacing: -2,
  },
  conditionText: {
    color: T.textSecondary,
    fontSize: T.fontBase,
    fontWeight: T.light,
    marginTop: T.s1,
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    padding: T.s4,
    marginBottom: T.s4,
  },
  detail: { flex: 1, alignItems: 'center' },
  detailLabel: { color: T.textTertiary, fontSize: 9, fontWeight: T.semibold, letterSpacing: T.trackingWidest, marginBottom: T.s1 },
  detailValue: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.light },
  detailDivider: { width: 1, backgroundColor: T.border },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  forecastItem: { alignItems: 'center' },
  forecastTime: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.medium, letterSpacing: T.trackingWide, marginBottom: T.s1 },
  forecastTemp: { color: T.textPrimary, fontSize: T.fontMd, fontWeight: T.light },
  forecastCond: { color: T.textTertiary, fontSize: 9, fontWeight: T.light, marginTop: T.s1 },
});
