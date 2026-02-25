import React from 'react';
import { View, StyleSheet } from 'react-native';
import { T } from '../theme';

// Swiss style: clean, static near-black. No gradients, no aurora, no orbs.
// A single subtle horizontal rule provides the only visual accent.
export default function AnimatedBackground() {
  return (
    <View style={styles.container}>
      <View style={styles.base} />
      {/* Subtle horizontal accent line -- Swiss poster reference */}
      <View style={styles.accentLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.bg,
  },
  accentLine: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: T.border,
  },
});
