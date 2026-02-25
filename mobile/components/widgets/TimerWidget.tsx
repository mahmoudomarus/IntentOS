import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

interface Props {
  phase: WidgetPhase;
  data: {
    duration_minutes?: number;
    label?: string;
    started_at?: string;
    ends_at?: string;
  };
  onDismiss: () => void;
}

export default function TimerWidget({ phase, data, onDismiss }: Props) {
  return (
    <WidgetShell
      title="Timer"
      subtitle={data.label || 'Timer'}
      phase={phase}
      searchingLabel="Setting your timer"
      onDismiss={onDismiss}
    >
      <ActiveView data={data} onDismiss={onDismiss} />
    </WidgetShell>
  );
}

function ActiveView({ data, onDismiss }: { data: Props['data']; onDismiss: () => void }) {
  const total = (data.duration_minutes || 1) * 60;
  const [left, setLeft] = useState(total);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || left <= 0) return;
    const iv = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(iv);
  }, [paused, left]);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const progress = total > 0 ? (total - left) / total : 1;
  const done = left <= 0;

  return (
    <View>
      {/* Time display */}
      <View style={st.timeDisplay}>
        <Text style={[st.timeText, done && st.timeDone]}>
          {done ? 'DONE' : `${m}:${String(s).padStart(2, '0')}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Controls */}
      <View style={st.controls}>
        <TouchableOpacity style={st.pauseBtn} onPress={() => setPaused(!paused)}>
          <Text style={st.pauseText}>{paused ? 'RESUME' : 'PAUSE'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.cancelBtn} onPress={onDismiss}>
          <Text style={st.cancelText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: T.s7,
  },
  timeText: {
    color: T.textPrimary,
    fontSize: T.font3xl,
    fontWeight: T.thin,
    letterSpacing: 4,
  },
  timeDone: {
    color: T.success,
    fontSize: T.fontXl,
    fontWeight: T.semibold,
    letterSpacing: T.trackingWidest,
  },
  progressTrack: {
    height: 2,
    backgroundColor: T.border,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: T.s5,
  },
  progressFill: { height: '100%' as any, backgroundColor: T.accent, borderRadius: 1 },
  controls: {
    flexDirection: 'row',
    gap: T.s3,
  },
  pauseBtn: {
    flex: 1,
    paddingVertical: T.s3,
    borderRadius: T.radiusSm,
    backgroundColor: T.accentLight,
    alignItems: 'center',
  },
  pauseText: { color: T.accent, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide },
  cancelBtn: {
    flex: 1,
    paddingVertical: T.s3,
    borderRadius: T.radiusSm,
    backgroundColor: T.dangerLight,
    alignItems: 'center',
  },
  cancelText: { color: T.danger, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide },
});
