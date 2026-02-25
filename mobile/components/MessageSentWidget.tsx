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

interface MessageData {
  status: string;
  timestamp: string;
  recipient: string;
  message: string;
}

interface Props {
  data: MessageData;
  onDismiss: () => void;
}

export default function MessageSentWidget({ data, onDismiss }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

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
    ]).start(() => {
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    });
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

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Checkmark */}
      <Animated.View
        style={[styles.checkCircle, { transform: [{ scale: checkAnim }] }]}
      >
        <Text style={styles.checkText}>✓</Text>
      </Animated.View>

      {/* Status */}
      <Text style={styles.statusText}>{data.status}</Text>

      {/* Recipient */}
      <View style={styles.recipientSection}>
        <Text style={styles.toLabel}>To</Text>
        <Text style={styles.recipientName}>{data.recipient}</Text>
      </View>

      {/* Message Bubble */}
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{data.message}</Text>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>{formatTime(data.timestamp)}</Text>

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
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(255, 255, 255, 0.05)' }
      : {
          shadowColor: '#FFFFFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 20,
          elevation: 10,
        }),
  } as any,
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkText: {
    color: '#30D158',
    fontSize: 28,
    fontWeight: '700',
  },
  statusText: {
    color: '#30D158',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 20,
  },
  recipientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  toLabel: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 14,
    marginRight: 8,
    fontWeight: '500',
  },
  recipientName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  messageBubble: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  messageText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 21,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 13,
    marginBottom: 16,
  },
  dismissButton: {
    alignSelf: 'stretch',
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
