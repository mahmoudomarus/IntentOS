import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

// ── Provider options ──
interface Provider {
  id: string;
  name: string;
  color: string;
  tagline: string;
}

const RIDE_PROVIDERS: Provider[] = [
  { id: 'uber', name: 'Uber', color: '#000000', tagline: 'Go anywhere' },
  { id: 'lyft', name: 'Lyft', color: '#FF00BF', tagline: 'Your ride, your way' },
  { id: 'waymo', name: 'Waymo', color: '#1EA362', tagline: 'Autonomous rides' },
  { id: 'via', name: 'Via', color: '#5B2D90', tagline: 'Shared & affordable' },
];

// ── Service tier options ──
interface ServiceOption {
  id: string;
  name: string;
  price: string;
  eta: string;
  description: string;
}

const SERVICE_OPTIONS: Record<string, ServiceOption[]> = {
  uber: [
    { id: 'economy', name: 'UberX', price: '$14.50', eta: '4 min', description: 'Affordable everyday rides' },
    { id: 'premium', name: 'Uber Black', price: '$28.00', eta: '2 min', description: 'Premium black cars' },
    { id: 'xl', name: 'UberXL', price: '$35.00', eta: '3 min', description: 'Extra seats for groups' },
  ],
  lyft: [
    { id: 'economy', name: 'Lyft Standard', price: '$13.50', eta: '3 min', description: 'Everyday rides' },
    { id: 'premium', name: 'Lyft Lux', price: '$32.00', eta: '5 min', description: 'High-end vehicles' },
    { id: 'xl', name: 'Lyft XL', price: '$30.00', eta: '4 min', description: 'More room for everyone' },
  ],
  waymo: [
    { id: 'economy', name: 'Waymo One', price: '$12.00', eta: '6 min', description: 'Self-driving ride' },
    { id: 'premium', name: 'Waymo Plus', price: '$18.00', eta: '4 min', description: 'Priority autonomous' },
  ],
  via: [
    { id: 'economy', name: 'Via Shared', price: '$8.50', eta: '7 min', description: 'Share your ride' },
    { id: 'premium', name: 'Via Private', price: '$16.00', eta: '5 min', description: 'Ride solo' },
  ],
};

interface Props {
  phase: WidgetPhase;
  data: {
    driver?: string;
    car?: string;
    plate?: string;
    eta?: string;
    price?: string;
    destination?: string;
    service?: string;
    provider?: string;
    coordinates?: { lat: number; lng: number };
    confirmingSubPhase?: 'searching_driver' | 'driver_found' | 'on_the_way';
  };
  onDismiss: () => void;
  onSelectProvider?: (providerId: string) => void;
  onSelectService?: (serviceId: string) => void;
}

export default function RideWidget({ phase, data, onDismiss, onSelectProvider, onSelectService }: Props) {
  return (
    <WidgetShell
      title="Ride"
      subtitle={data.destination || 'Finding your ride'}
      phase={phase}
      searchingLabel="Finding rides near you"
      confirmingLabel="Searching for a driver nearby"
      confirmingSubPhase={data.confirmingSubPhase}
      confirmingDetails={data.driver ? { driver: data.driver, car: data.car, eta: data.eta } : undefined}
      onDismiss={onDismiss}
    >
      {phase === 'providers' ? (
        <ProvidersView onSelect={onSelectProvider} />
      ) : phase === 'options' ? (
        <OptionsView provider={data.provider || 'uber'} onSelect={onSelectService} />
      ) : phase === 'active' || phase === 'done' ? (
        <ActiveView data={data} onDismiss={onDismiss} />
      ) : null}
    </WidgetShell>
  );
}

// ---------- Providers Phase ----------
function ProvidersView({ onSelect }: { onSelect?: (id: string) => void }) {
  return (
    <View>
      <Text style={provStyles.label}>CHOOSE YOUR RIDE APP</Text>
      <View style={provStyles.grid}>
        {RIDE_PROVIDERS.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={provStyles.card}
            activeOpacity={0.6}
            onPress={() => onSelect?.(p.id)}
          >
            <View style={[provStyles.iconCircle, { backgroundColor: p.color }]}>
              <Text style={provStyles.iconLetter}>{p.name.charAt(0)}</Text>
            </View>
            <Text style={provStyles.provName}>{p.name}</Text>
            <Text style={provStyles.tagline}>{p.tagline}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const provStyles = StyleSheet.create({
  label: {
    color: T.textTertiary,
    fontSize: T.fontXs,
    fontWeight: T.semibold,
    letterSpacing: T.trackingWidest,
    marginBottom: T.s4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: T.s2,
  },
  card: {
    width: '48%' as any,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    padding: T.s4,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: T.s3,
  },
  iconLetter: {
    color: '#FFFFFF',
    fontSize: T.fontLg,
    fontWeight: T.bold,
  },
  provName: {
    color: T.textPrimary,
    fontSize: T.fontBase,
    fontWeight: T.medium,
    marginBottom: 2,
  },
  tagline: {
    color: T.textTertiary,
    fontSize: T.fontXs,
    fontWeight: T.light,
    textAlign: 'center',
  },
});

// ---------- Options Phase (service tiers) ----------
function OptionsView({ provider, onSelect }: { provider: string; onSelect?: (id: string) => void }) {
  const options = SERVICE_OPTIONS[provider] || SERVICE_OPTIONS.uber;
  const providerName = RIDE_PROVIDERS.find(p => p.id === provider)?.name || 'Ride';
  return (
    <View style={optStyles.container}>
      <Text style={optStyles.label}>SELECT {providerName.toUpperCase()} SERVICE</Text>
      <View style={optStyles.list}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={optStyles.card}
            activeOpacity={0.6}
            onPress={() => onSelect?.(opt.id)}
          >
            <View style={optStyles.cardLeft}>
              <Text style={optStyles.cardName}>{opt.name}</Text>
              <Text style={optStyles.cardDesc}>{opt.description}</Text>
            </View>
            <View style={optStyles.cardRight}>
              <Text style={optStyles.cardPrice}>{opt.price}</Text>
              <Text style={optStyles.cardEta}>{opt.eta}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const optStyles = StyleSheet.create({
  container: {},
  label: {
    color: T.textTertiary,
    fontSize: T.fontXs,
    fontWeight: T.semibold,
    letterSpacing: T.trackingWidest,
    marginBottom: T.s4,
  },
  list: { gap: T.s2 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    padding: T.s5,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardLeft: { flex: 1 },
  cardName: { color: T.textPrimary, fontSize: T.fontMd, fontWeight: T.medium },
  cardDesc: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.light, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardPrice: { color: T.textPrimary, fontSize: T.fontLg, fontWeight: T.light, letterSpacing: T.trackingTight },
  cardEta: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.light, marginTop: 2 },
});

// ---------- Active Phase ----------
function ActiveView({ data, onDismiss }: { data: Props['data']; onDismiss: () => void }) {
  const serviceLabel = (data.service || 'economy').toUpperCase();
  const providerLabel = (data.provider || 'uber').toUpperCase();

  return (
    <View style={actStyles.container}>
      <View style={actStyles.statsRow}>
        <View style={actStyles.stat}>
          <Text style={actStyles.statLabel}>ETA</Text>
          <Text style={actStyles.statValue}>{data.eta || '4 min'}</Text>
        </View>
        <View style={actStyles.statDivider} />
        <View style={actStyles.stat}>
          <Text style={actStyles.statLabel}>PRICE</Text>
          <Text style={actStyles.statValue}>{data.price || '$14.50'}</Text>
        </View>
        <View style={actStyles.statDivider} />
        <View style={actStyles.stat}>
          <Text style={actStyles.statLabel}>VIA</Text>
          <Text style={actStyles.statValue}>{providerLabel}</Text>
        </View>
      </View>

      <View style={actStyles.driverRow}>
        <View style={actStyles.avatar}>
          <Text style={actStyles.avatarText}>{(data.driver || 'S').charAt(0)}</Text>
        </View>
        <View style={actStyles.driverInfo}>
          <Text style={actStyles.driverName}>{data.driver || 'Driver'}</Text>
          <Text style={actStyles.carInfo}>{data.car || 'Vehicle'} {data.plate ? `\u00B7 ${data.plate}` : ''}</Text>
        </View>
      </View>

      <View style={actStyles.actions}>
        <TouchableOpacity style={actStyles.cancelBtn} onPress={onDismiss}>
          <Text style={actStyles.cancelText}>CANCEL RIDE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const actStyles = StyleSheet.create({
  container: {},
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    padding: T.s4,
    marginBottom: T.s5,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: T.textTertiary, fontSize: 9, fontWeight: T.semibold, letterSpacing: T.trackingWidest, marginBottom: T.s1 },
  statValue: { color: T.textPrimary, fontSize: T.fontMd, fontWeight: T.light },
  statDivider: { width: 1, backgroundColor: T.border },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: T.s5 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center', marginRight: T.s4 },
  avatarText: { color: T.textPrimary, fontSize: T.fontMd, fontWeight: T.semibold },
  driverInfo: { flex: 1 },
  driverName: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium },
  carInfo: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.light, marginTop: 1 },
  actions: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: T.s4 },
  cancelBtn: { paddingVertical: T.s3, borderRadius: T.radiusSm, backgroundColor: T.dangerLight, alignItems: 'center' },
  cancelText: { color: T.danger, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide },
});
