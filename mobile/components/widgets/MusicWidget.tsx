import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

const MUSIC_PROVIDERS = [
  { id: 'spotify', name: 'Spotify', color: '#1DB954', tagline: 'Music for everyone' },
  { id: 'apple_music', name: 'Apple Music', color: '#FC3C44', tagline: '100M+ songs' },
  { id: 'youtube_music', name: 'YouTube Music', color: '#FF0000', tagline: 'Music & videos' },
  { id: 'soundcloud', name: 'SoundCloud', color: '#FF5500', tagline: 'Discover new music' },
];

interface Props {
  phase: WidgetPhase;
  data: {
    action?: string;
    track?: string;
    artist?: string;
    album?: string;
    duration?: string;
    is_playing?: boolean;
    progress?: number;
    provider?: string;
  };
  onDismiss: () => void;
  onSelectProvider?: (providerId: string) => void;
}

export default function MusicWidget({ phase, data, onDismiss, onSelectProvider }: Props) {
  return (
    <WidgetShell
      title="Music"
      subtitle={data.track || 'Now Playing'}
      phase={phase}
      searchingLabel="Finding your music"
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
      <Text style={prov.label}>PLAY ON</Text>
      <View style={prov.grid}>
        {MUSIC_PROVIDERS.map((p) => (
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
  const [playing, setPlaying] = useState(data.is_playing ?? true);
  const [progress, setProgress] = useState(0);
  const providerName = MUSIC_PROVIDERS.find(p => p.id === data.provider)?.name;
  const providerColor = MUSIC_PROVIDERS.find(p => p.id === data.provider)?.color || T.accent;

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setProgress((p) => Math.min(100, p + 0.5)), 100);
    return () => clearInterval(iv);
  }, [playing]);

  const elapsed = Math.floor((progress / 100) * 200);
  const m = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  return (
    <View>
      {providerName && (
        <View style={[st.providerBadge, { backgroundColor: providerColor + '18' }]}>
          <Text style={[st.providerText, { color: providerColor }]}>ON {providerName.toUpperCase()}</Text>
        </View>
      )}

      <View style={st.trackInfo}>
        <Text style={st.trackName}>{data.track || 'Unknown'}</Text>
        <Text style={st.artistName}>{data.artist || 'Unknown Artist'}</Text>
        <Text style={st.albumName}>{data.album || ''}</Text>
      </View>

      <View style={st.progressContainer}>
        <View style={st.progressTrack}>
          <View style={[st.progressFill, { width: `${progress}%`, backgroundColor: providerColor }]} />
        </View>
        <View style={st.timeRow}>
          <Text style={st.timeText}>{m}:{String(sec).padStart(2, '0')}</Text>
          <Text style={st.timeText}>{data.duration || '3:20'}</Text>
        </View>
      </View>

      <View style={st.controls}>
        <TouchableOpacity style={st.controlBtn}><Text style={st.controlText}>{'|◁'}</Text></TouchableOpacity>
        <TouchableOpacity style={[st.playBtn, { backgroundColor: providerColor }]} onPress={() => setPlaying(!playing)}>
          <Text style={st.playText}>{playing ? '❚❚' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.controlBtn}><Text style={st.controlText}>{'▷|'}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  providerBadge: { borderRadius: T.radiusXs, paddingHorizontal: T.s3, paddingVertical: T.s1, alignSelf: 'flex-start', marginBottom: T.s4 },
  providerText: { fontSize: 9, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
  trackInfo: { marginBottom: T.s5 },
  trackName: { color: T.textPrimary, fontSize: T.fontLg, fontWeight: T.medium },
  artistName: { color: T.textSecondary, fontSize: T.fontBase, fontWeight: T.light, marginTop: 2 },
  albumName: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.light, marginTop: 2 },
  progressContainer: { marginBottom: T.s5 },
  progressTrack: { height: 2, backgroundColor: T.border, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%' as any, borderRadius: 1 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: T.s2 },
  timeText: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.light },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: T.s6 },
  controlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  controlText: { color: T.textSecondary, fontSize: T.fontBase },
  playBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  playText: { color: T.textPrimary, fontSize: T.fontMd },
});
