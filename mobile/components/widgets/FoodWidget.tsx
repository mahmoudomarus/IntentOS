import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

const FOOD_PROVIDERS = [
  { id: 'doordash', name: 'DoorDash', color: '#FF3008', tagline: 'Delivery in minutes' },
  { id: 'ubereats', name: 'Uber Eats', color: '#06C167', tagline: 'Eat what you want' },
  { id: 'grubhub', name: 'Grubhub', color: '#F63440', tagline: 'Perks on every order' },
  { id: 'postmates', name: 'Postmates', color: '#FFDF00', tagline: 'Anything delivered' },
];

const STEPS = ['Confirmed', 'Preparing', 'On the way', 'Delivered'];

interface Props {
  phase: WidgetPhase;
  data: {
    status?: string;
    total?: string;
    courier?: string;
    eta?: string;
    restaurant?: string;
    items?: string[];
    order_id?: string;
    special_instructions?: string;
    provider?: string;
  };
  onDismiss: () => void;
  onSelectProvider?: (providerId: string) => void;
}

export default function FoodWidget({ phase, data, onDismiss, onSelectProvider }: Props) {
  return (
    <WidgetShell
      title="Food Order"
      subtitle={data.restaurant || 'Finding restaurants'}
      phase={phase}
      searchingLabel="Placing your order"
      confirmingLabel="Confirming with restaurant"
      onDismiss={onDismiss}
    >
      {phase === 'providers' ? (
        <ProvidersView onSelect={onSelectProvider} />
      ) : (
        <ActiveView data={data} onDismiss={onDismiss} />
      )}
    </WidgetShell>
  );
}

function ProvidersView({ onSelect }: { onSelect?: (id: string) => void }) {
  return (
    <View>
      <Text style={prov.label}>CHOOSE DELIVERY APP</Text>
      <View style={prov.grid}>
        {FOOD_PROVIDERS.map((p) => (
          <TouchableOpacity key={p.id} style={prov.card} activeOpacity={0.6} onPress={() => onSelect?.(p.id)}>
            <View style={[prov.iconCircle, { backgroundColor: p.color }]}>
              <Text style={prov.iconLetter}>{p.name.charAt(0)}</Text>
            </View>
            <Text style={prov.provName}>{p.name}</Text>
            <Text style={prov.tagline}>{p.tagline}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const prov = StyleSheet.create({
  label: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest, marginBottom: T.s4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },
  card: {
    width: '48%' as any,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    padding: T.s4,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: T.s3 },
  iconLetter: { color: '#FFFFFF', fontSize: T.fontLg, fontWeight: T.bold },
  provName: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium, marginBottom: 2 },
  tagline: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.light, textAlign: 'center' },
});

function ActiveView({ data, onDismiss }: { data: Props['data']; onDismiss: () => void }) {
  const [currentStep] = useState(1);
  const providerName = FOOD_PROVIDERS.find(p => p.id === data.provider)?.name || 'Delivery';

  return (
    <View>
      {data.provider && (
        <View style={s.providerBadge}>
          <Text style={s.providerText}>VIA {providerName.toUpperCase()}</Text>
        </View>
      )}

      {data.items && data.items.length > 0 && (
        <View style={s.itemsList}>
          {data.items.map((item, i) => (
            <View key={i} style={s.itemRow}>
              <View style={s.bullet} />
              <Text style={s.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.statusBar}>
        <View style={s.statusRow}>
          <Text style={s.statusLabel}>{data.status || 'Preparing'}</Text>
          <Text style={s.etaText}>ETA {data.eta || '15 min'}</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
        </View>
        <View style={s.stepsRow}>
          {STEPS.map((step, i) => (
            <Text key={step} style={[s.stepText, i <= currentStep && s.stepActive]}>{step}</Text>
          ))}
        </View>
      </View>

      <View style={s.footer}>
        <View style={s.courierRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(data.courier || 'C').charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.courierName}>{data.courier || 'Courier'}</Text>
            <Text style={s.courierLabel}>YOUR COURIER</Text>
          </View>
          <Text style={s.total}>{data.total || '$0.00'}</Text>
        </View>
      </View>

      <TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
        <Text style={s.dismissText}>DISMISS</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  providerBadge: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: T.radiusXs, paddingHorizontal: T.s3, paddingVertical: T.s1, alignSelf: 'flex-start', marginBottom: T.s4 },
  providerText: { color: T.textSecondary, fontSize: 9, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
  itemsList: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: T.radiusSm, padding: T.s4, marginBottom: T.s4, gap: T.s2 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.textTertiary, marginRight: T.s3 },
  itemText: { color: T.textSecondary, fontSize: T.fontBase, fontWeight: T.light },
  statusBar: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: T.radiusSm, padding: T.s4, marginBottom: T.s4 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: T.s3 },
  statusLabel: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium },
  etaText: { color: T.textTertiary, fontSize: T.fontSm },
  progressTrack: { height: 2, backgroundColor: T.border, borderRadius: 1, overflow: 'hidden', marginBottom: T.s3 },
  progressFill: { height: '100%' as any, backgroundColor: T.success, borderRadius: 1 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepText: { color: T.textMuted, fontSize: 9, fontWeight: T.medium, letterSpacing: T.trackingWide, textTransform: 'uppercase' },
  stepActive: { color: T.success },
  footer: { marginBottom: T.s4 },
  courierRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.success, justifyContent: 'center', alignItems: 'center', marginRight: T.s3 },
  avatarText: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.semibold },
  courierName: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium },
  courierLabel: { color: T.textTertiary, fontSize: 9, fontWeight: T.medium, letterSpacing: T.trackingWide, marginTop: 1 },
  total: { color: T.success, fontSize: T.fontLg, fontWeight: T.light },
  dismissBtn: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: T.s4, alignItems: 'center' },
  dismissText: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
});
