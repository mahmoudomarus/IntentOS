import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, typography, layout } from '../theme';
import { useTheme } from './ThemeProvider';

interface MinimizedWidget {
  id: string;
  name: string;
  label: string;
}

type GatewayStatus = 'disconnected' | 'connecting' | 'handshaking' | 'connected';

interface Props {
  isConnected: boolean;
  gatewayStatus?: GatewayStatus;
  minimizedWidgets: MinimizedWidget[];
  onWidgetPress: (id: string) => void;
  onSettingsPress?: () => void;
}

const GW_STATUS_LABELS: Record<GatewayStatus, string> = {
  disconnected: 'GW OFF',
  connecting: 'GW ...',
  handshaking: 'GW AUTH',
  connected: 'GW OK',
};

export default function TopStatusBar({ isConnected, gatewayStatus, minimizedWidgets, onWidgetPress, onSettingsPress }: Props) {
  const gwStatus = gatewayStatus || 'disconnected';
  const gwConnected = gwStatus === 'connected';
  const { colors, mode, setMode } = useTheme();

  const handleThemeToggle = () => {
    if (mode === 'system') setMode('dark');
    else if (mode === 'dark') setMode('light');
    else setMode('system');
  };

  const getThemeIcon = () => {
    if (mode === 'system') return '⚙️';
    if (mode === 'dark') return '🌙';
    return '☀️';
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: isConnected ? colors.success : colors.textTertiary }]} />
        <Text style={[styles.title, { color: colors.textTertiary }]}>INTENT OS</Text>
        <View style={[styles.gwBadge, {
          borderColor: gwConnected ? colors.successLight : colors.border,
          backgroundColor: gwConnected ? colors.successLight : 'transparent'
        }]}>
          <Text style={[styles.gwBadgeText, { color: gwConnected ? colors.success : colors.textTertiary }]}>
            {GW_STATUS_LABELS[gwStatus]}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        {minimizedWidgets.length > 0 && (
          <View style={styles.pills}>
            {minimizedWidgets.map((w) => (
              <TouchableOpacity key={w.id} style={[styles.pill, { backgroundColor: colors.cardBgHover, borderColor: colors.border }]} onPress={() => onWidgetPress(w.id)}>
                <Text style={[styles.pillText, { color: colors.textTertiary }]}>{w.label.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.cardBgHover, borderColor: colors.border }]} onPress={handleThemeToggle}>
          <Text style={[styles.settingsIcon, { color: colors.textTertiary }]}>{getThemeIcon()}</Text>
        </TouchableOpacity>
        {onSettingsPress && (
          <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.cardBgHover, borderColor: colors.border }]} onPress={onSettingsPress}>
            <Text style={[styles.settingsIcon, { color: colors.textTertiary }]}>⚙</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s3,
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.s2,
  },
  title: {
    fontSize: typography.fontXs,
    fontWeight: typography.semibold,
    letterSpacing: typography.trackingWidest,
  },
  pills: {
    flexDirection: 'row',
    gap: spacing.s2,
  },
  pill: {
    borderRadius: layout.radiusXs,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s1,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 9,
    fontWeight: typography.semibold,
    letterSpacing: typography.trackingWide,
  },
  gwBadge: {
    marginLeft: spacing.s3,
    borderRadius: layout.radiusXs,
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
    borderWidth: 1,
  },
  gwBadgeText: {
    fontSize: 8,
    fontWeight: typography.semibold,
    letterSpacing: typography.trackingWide,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  settingsBtn: {
    width: 28,
    height: 28,
    borderRadius: layout.radiusXs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  settingsIcon: {
    fontSize: 14,
  },
});
