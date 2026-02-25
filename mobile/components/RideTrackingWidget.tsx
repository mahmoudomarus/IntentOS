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

interface RideData {
  driver: string;
  car: string;
  plate: string;
  eta: string;
  destination: string;
  coordinates?: { lat: number; lng: number };
}

interface Props {
  data: RideData;
  onDismiss: () => void;
}

export default function RideTrackingWidget({ data, onDismiss }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

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

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusDot} />
        <Text style={styles.headerText}>Ride Arriving</Text>
        <Text style={styles.etaBadge}>{data.eta}</Text>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>📍</Text>
        <Text style={styles.mapText}>{data.destination}</Text>
        {data.coordinates && (
          <Text style={styles.coordText}>
            {data.coordinates.lat.toFixed(4)}, {data.coordinates.lng.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Driver Info */}
      <View style={styles.driverSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {data.driver.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{data.driver}</Text>
          <Text style={styles.carInfo}>
            {data.car} · {data.plate}
          </Text>
        </View>
        <View style={styles.callButton}>
          <Text style={styles.callIcon}>📞</Text>
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
      ? { boxShadow: '0 4px 20px rgba(0, 122, 255, 0.15)' }
      : {
          shadowColor: '#007AFF',
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
    marginRight: 8,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  etaBadge: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: '700',
  },
  mapPlaceholder: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  mapText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  coordText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  carInfo: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 2,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: {
    fontSize: 20,
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
