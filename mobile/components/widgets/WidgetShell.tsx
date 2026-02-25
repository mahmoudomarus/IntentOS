import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { T } from '../../theme';

const USE_NATIVE = Platform.OS !== 'web';

export type WidgetPhase = 'searching' | 'providers' | 'options' | 'confirming' | 'active' | 'done';

interface Props {
  title: string;
  subtitle?: string;
  phase: WidgetPhase;
  searchingLabel?: string;
  confirmingLabel?: string;
  confirmingSubPhase?: 'searching_driver' | 'driver_found' | 'on_the_way';
  confirmingDetails?: { driver?: string; car?: string; eta?: string };
  onDismiss: () => void;
  children: React.ReactNode;
}

// Skeleton shimmer bar
function ShimmerBar({ width, height = 12, delay = 0 }: { width: number | string; height?: number; delay?: number }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.03, 0.08],
  });

  return (
    <Animated.View
      style={[
        styles.shimmerBar,
        {
          width: width as any,
          height,
          backgroundColor: 'white',
          opacity,
        },
      ]}
    />
  );
}

// Skeleton loading view
function SearchingView({ label }: { label: string }) {
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(dotAnim, { toValue: 3, duration: 2000, useNativeDriver: false })
    ).start();
  }, []);

  return (
    <View style={styles.searchingContainer}>
      <Text style={styles.searchingLabel}>{label}</Text>
      <View style={styles.shimmerGroup}>
        <ShimmerBar width="100%" height={48} delay={0} />
        <ShimmerBar width="80%" height={48} delay={200} />
        <ShimmerBar width="60%" height={48} delay={400} />
      </View>
    </View>
  );
}

// Progressive confirming view
function ConfirmingProgressView({
  label,
  subPhase,
  details,
}: {
  label: string;
  subPhase?: 'searching_driver' | 'driver_found' | 'on_the_way';
  details?: { driver?: string; car?: string; eta?: string };
}) {
  const dotAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(dotAnim, { toValue: 3, duration: 2000, useNativeDriver: false })
    ).start();
  }, []);

  useEffect(() => {
    if (subPhase === 'driver_found' || subPhase === 'on_the_way') {
      fadeIn.setValue(0);
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: USE_NATIVE }).start();
    }
  }, [subPhase]);

  if (subPhase === 'driver_found' && details) {
    return (
      <Animated.View style={[styles.confirmingProgress, { opacity: fadeIn }]}>
        <View style={styles.driverFoundRow}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitial}>{details.driver?.[0] || '?'}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{details.driver || 'Driver'} found</Text>
            <Text style={styles.driverDetail}>{details.car || 'Vehicle'}</Text>
            <Text style={styles.driverEta}>{details.eta || 'On the way'}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (subPhase === 'on_the_way' && details) {
    return (
      <Animated.View style={[styles.confirmingProgress, { opacity: fadeIn }]}>
        <View style={styles.driverFoundRow}>
          <View style={[styles.driverAvatar, styles.driverAvatarActive]}>
            <Text style={styles.driverInitial}>{details.driver?.[0] || '?'}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{details.driver} is on the way</Text>
            <Text style={styles.driverDetail}>{details.car}</Text>
            <Text style={[styles.driverEta, styles.driverEtaActive]}>Arriving in {details.eta}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Default: searching state with shimmer
  return (
    <View style={styles.searchingContainer}>
      <Text style={styles.searchingLabel}>{label}</Text>
      <View style={styles.shimmerGroup}>
        <ShimmerBar width="100%" height={48} delay={0} />
        <ShimmerBar width="80%" height={36} delay={200} />
      </View>
    </View>
  );
}

export default function WidgetShell({
  title,
  subtitle,
  phase,
  searchingLabel = 'Searching...',
  confirmingLabel = 'Confirming...',
  confirmingSubPhase,
  confirmingDetails,
  onDismiss,
  children,
}: Props) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: USE_NATIVE }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 60, duration: 250, useNativeDriver: USE_NATIVE }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: USE_NATIVE }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={styles.closeBtn}>
            <Text style={styles.closeText}>{'×'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Phase content */}
      {phase === 'searching' ? (
        <SearchingView label={searchingLabel} />
      ) : phase === 'confirming' ? (
        <ConfirmingProgressView
          label={confirmingLabel}
          subPhase={confirmingSubPhase}
          details={confirmingDetails}
        />
      ) : (
        children
      )}

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: T.cardBg,
    borderRadius: T.radius,
    padding: T.s6,
    marginHorizontal: T.s4,
    borderWidth: 1,
    borderColor: T.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: T.s5,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: T.textSecondary,
    fontSize: T.fontXs,
    fontWeight: T.semibold,
    letterSpacing: T.trackingWidest,
  },
  subtitle: {
    color: T.textPrimary,
    fontSize: T.fontLg,
    fontWeight: T.light,
    marginTop: T.s1,
    letterSpacing: T.trackingTight,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: T.textTertiary,
    fontSize: 18,
    lineHeight: 20,
  },
  searchingContainer: {
    paddingVertical: T.s2,
  },
  searchingLabel: {
    color: T.textTertiary,
    fontSize: T.fontSm,
    fontWeight: T.medium,
    letterSpacing: T.trackingWide,
    textTransform: 'uppercase',
    marginBottom: T.s4,
  },
  shimmerGroup: {
    gap: T.s3,
  },
  shimmerBar: {
    borderRadius: T.radiusSm,
  },
  confirmingProgress: {
    paddingVertical: T.s2,
  },
  driverFoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: T.s4,
    borderWidth: 1,
    borderColor: T.border,
  },
  driverAvatarActive: {
    borderColor: T.accent,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  driverInitial: {
    color: T.textPrimary,
    fontSize: T.fontLg,
    fontWeight: T.semibold as any,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: T.textPrimary,
    fontSize: T.fontBase,
    fontWeight: T.medium as any,
    marginBottom: 2,
  },
  driverDetail: {
    color: T.textSecondary,
    fontSize: T.fontSm,
    fontWeight: T.light as any,
  },
  driverEta: {
    color: T.textTertiary,
    fontSize: T.fontSm,
    fontWeight: T.medium as any,
    marginTop: 2,
  },
  driverEtaActive: {
    color: T.accent,
  },
});

export { ShimmerBar, SearchingView };
