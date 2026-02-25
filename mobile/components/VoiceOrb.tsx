import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { spacing, typography, layout } from '../theme';
import { useTheme } from './ThemeProvider';

const USE_NATIVE = Platform.OS !== 'web';

type VoiceState = 'disconnected' | 'connecting' | 'idle' | 'listening' | 'speaking' | 'thinking';

interface Props {
  voiceState: VoiceState;
  transcript: string;
  aiTranscript: string;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  onPress: () => void;
}

export default function VoiceOrb({ voiceState, transcript, aiTranscript, isMuted, onMuteToggle, onPress }: Props) {
  const { colors } = useTheme();

  // Swiss animations are mechanical, structural rather than soft.
  // We manipulate direct scale. No drop shadows, no fading concentric rings.
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    dotScale.stopAnimation();

    if (voiceState === 'listening') {
      // Rapid, highly functional tempo — mechanical alert
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 1.15, duration: 250, useNativeDriver: USE_NATIVE }),
          Animated.timing(dotScale, { toValue: 0.95, duration: 250, useNativeDriver: USE_NATIVE }),
        ])
      ).start();
    } else if (voiceState === 'thinking') {
      // Fast, dense calculation pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 1.05, duration: 150, useNativeDriver: USE_NATIVE }),
          Animated.timing(dotScale, { toValue: 0.95, duration: 150, useNativeDriver: USE_NATIVE }),
        ])
      ).start();
    } else if (voiceState === 'speaking') {
      // Structural modulation
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 0.9, duration: 500, useNativeDriver: USE_NATIVE }),
          Animated.timing(dotScale, { toValue: 1.05, duration: 500, useNativeDriver: USE_NATIVE }),
        ])
      ).start();
    } else if (voiceState === 'idle') {
      // Very slow, monolithic presence breathing
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, { toValue: 1.03, duration: 3000, useNativeDriver: USE_NATIVE }),
          Animated.timing(dotScale, { toValue: 1.0, duration: 3000, useNativeDriver: USE_NATIVE }),
        ])
      ).start();
    } else {
      Animated.timing(dotScale, { toValue: 1, duration: 300, useNativeDriver: USE_NATIVE }).start();
    }
  }, [voiceState]);

  // Mono/Duotone strict palette decisions based on Swiss UI rules
  const dotColor =
    voiceState === 'listening' ? colors.danger
      : voiceState === 'thinking' ? colors.accent
        : voiceState === 'speaking' ? colors.textPrimary
          : voiceState === 'idle' ? colors.textPrimary
            : voiceState === 'connecting' ? colors.warning
              : colors.border; // Disconnected state

  const labelColor =
    voiceState === 'disconnected' ? colors.textSecondary
      : voiceState === 'speaking' ? colors.success
        : voiceState === 'thinking' ? colors.accent
          : voiceState === 'listening' ? colors.danger
            : colors.textPrimary;

  const statusLabel =
    voiceState === 'disconnected' ? 'TAP TO CONNECT'
      : voiceState === 'connecting' ? 'CONNECTING'
        : voiceState === 'listening' ? 'LISTENING'
          : voiceState === 'thinking' ? 'THINKING'
            : voiceState === 'speaking' ? 'SPEAKING'
              : 'READY';

  const liveText =
    voiceState === 'listening' && transcript ? transcript
      : (voiceState === 'speaking' || voiceState === 'idle') && aiTranscript ? aiTranscript
        : '';

  return (
    <View style={styles.container}>
      {/* High-contrast geometric primitive */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              transform: [{ scale: dotScale }],
            },
          ]}
        />
      </TouchableOpacity>

      {/* Structured, high-tracking grotesque label */}
      <Text style={[styles.statusLabel, { color: labelColor }]}>{statusLabel}</Text>

      {/* Unornamented transcript output */}
      {liveText ? (
        <Text style={[styles.transcript, { color: colors.textSecondary }]} numberOfLines={4}>
          {liveText}
        </Text>
      ) : null}

      {/* Conditional Mute Toggle */}
      {['listening', 'speaking', 'idle'].includes(voiceState) && onMuteToggle && (
        <TouchableOpacity style={styles.muteBtn} onPress={onMuteToggle}>
          <Text style={[styles.muteBtnText, { color: isMuted ? colors.danger : colors.textSecondary }]}>
            {isMuted ? 'UNMUTE 🔇' : 'MUTE 🎙️'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    // Pure geometric
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  statusLabel: {
    fontSize: typography.fontXs,
    fontWeight: typography.bold,
    letterSpacing: typography.trackingWidest,
    marginTop: spacing.s5,
    textTransform: 'uppercase',
  },
  transcript: {
    fontSize: typography.fontMd,
    fontWeight: typography.medium,
    textAlign: 'center',
    marginTop: spacing.s4,
    maxWidth: 280,
    lineHeight: 24,
  },
  muteBtn: {
    marginTop: spacing.s4,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    borderRadius: layout.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  muteBtnText: {
    fontSize: typography.fontXs,
    fontWeight: typography.bold,
    letterSpacing: typography.trackingWide,
  },
});
