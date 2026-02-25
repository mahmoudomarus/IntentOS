import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

const MSG_PROVIDERS = [
  { id: 'imessage', name: 'iMessage', color: '#34C759', tagline: 'Apple Messages' },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', tagline: 'End-to-end encrypted' },
  { id: 'gmail', name: 'Gmail', color: '#EA4335', tagline: 'Send an email' },
  { id: 'telegram', name: 'Telegram', color: '#0088CC', tagline: 'Fast & secure' },
  { id: 'slack', name: 'Slack', color: '#4A154B', tagline: 'Work messaging' },
  { id: 'sms', name: 'SMS', color: '#5856D6', tagline: 'Text message' },
];

interface Props {
  phase: WidgetPhase;
  data: {
    status?: string;
    timestamp?: string;
    recipient?: string;
    message?: string;
    provider?: string;
  };
  onDismiss: () => void;
  onSelectProvider?: (providerId: string) => void;
}

export default function MessageWidget({ phase, data, onDismiss, onSelectProvider }: Props) {
  return (
    <WidgetShell
      title="Message"
      subtitle={data.recipient ? `To ${data.recipient}` : 'Sending message'}
      phase={phase}
      searchingLabel="Preparing message"
      confirmingLabel="Sending via platform"
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
      <Text style={prov.label}>SEND VIA</Text>
      <View style={prov.grid}>
        {MSG_PROVIDERS.map((p) => (
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
    width: '31%' as any,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    paddingVertical: T.s4,
    paddingHorizontal: T.s2,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: T.s2 },
  iconLetter: { color: '#FFFFFF', fontSize: T.fontMd, fontWeight: T.bold },
  provName: { color: T.textPrimary, fontSize: T.fontSm, fontWeight: T.medium, marginBottom: 1 },
  tagline: { color: T.textTertiary, fontSize: 9, fontWeight: T.light, textAlign: 'center' },
});

function ActiveView({ data, onDismiss }: { data: Props['data']; onDismiss: () => void }) {
  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const providerName = MSG_PROVIDERS.find(p => p.id === data.provider)?.name;

  return (
    <View>
      <View style={s.statusRow}>
        <View style={s.checkDot} />
        <Text style={s.statusText}>{data.status || 'Sent'}</Text>
        <Text style={s.timeText}>{formatTime(data.timestamp)}</Text>
      </View>

      {providerName && (
        <View style={s.providerBadge}>
          <Text style={s.providerText}>VIA {providerName.toUpperCase()}</Text>
        </View>
      )}

      <View style={s.recipientRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(data.recipient || 'U').charAt(0)}</Text>
        </View>
        <Text style={s.recipientName}>{data.recipient || 'Contact'}</Text>
      </View>

      <View style={s.bubble}>
        <Text style={s.messageText}>{data.message || ''}</Text>
      </View>

      <TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
        <Text style={s.dismissText}>DISMISS</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: T.s4 },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.success, marginRight: T.s2 },
  statusText: { color: T.success, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide, textTransform: 'uppercase', flex: 1 },
  timeText: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.light },
  providerBadge: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: T.radiusXs, paddingHorizontal: T.s3, paddingVertical: T.s1, alignSelf: 'flex-start', marginBottom: T.s4 },
  providerText: { color: T.textSecondary, fontSize: 9, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
  recipientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: T.s4 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.accent, justifyContent: 'center', alignItems: 'center', marginRight: T.s3 },
  avatarText: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.semibold },
  recipientName: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium },
  bubble: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: T.radiusSm, padding: T.s4, marginBottom: T.s5 },
  messageText: { color: T.textSecondary, fontSize: T.fontBase, fontWeight: T.light, lineHeight: 22 },
  dismissBtn: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: T.s4, alignItems: 'center' },
  dismissText: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
});
