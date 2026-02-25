import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useEffect, useRef } from 'react';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface FoodData {
  status: string;
  total: string;
  courier: string;
  eta: string;
  restaurant: string;
  item: string;
}

interface Props {
  data: FoodData;
  onDismiss: () => void;
}

export default function FoodDeliveryWidget({ data, onDismiss }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    // Progress bar uses layout animation (can't use native driver for width)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => onDismiss());
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '35%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>🍽️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerText}>{data.restaurant}</Text>
          <Text style={styles.itemText}>{data.item}</Text>
        </View>
        <Text style={styles.totalBadge}>{data.total}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusIndicator, { backgroundColor: '#30D158' }]}
          />
          <Text style={styles.statusLabel}>{data.status}</Text>
          <Text style={styles.etaText}>ETA {data.eta}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>

        {/* Steps */}
        <View style={styles.stepsRow}>
          <Text style={[styles.stepText, styles.stepActive]}>Confirmed</Text>
          <Text style={[styles.stepText, styles.stepActive]}>Preparing</Text>
          <Text style={styles.stepText}>On the way</Text>
          <Text style={styles.stepText}>Delivered</Text>
        </View>
      </View>

      {/* Courier Info */}
      <View style={styles.courierSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {data.courier.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.courierName}>{data.courier}</Text>
          <Text style={styles.courierLabel}>Your courier</Text>
        </View>
        <View style={styles.messageButton}>
          <Text style={styles.messageIcon}>💬</Text>
        </View>
      </View>

      {/* Dismiss */}
      <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(48, 209, 88, 0.15)' }
      : {
          shadowColor: '#30D158',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10,
        }),
  } as any,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  itemText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 2,
  },
  totalBadge: {
    color: '#30D158',
    fontSize: 20,
    fontWeight: '700',
  },
  statusSection: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  etaText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%' as any,
    backgroundColor: '#30D158',
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepText: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    fontWeight: '500',
  },
  stepActive: {
    color: '#30D158',
  },
  courierSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#30D158',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  courierName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  courierLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    marginTop: 1,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIcon: {
    fontSize: 18,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  dismissText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '500',
  },
});
