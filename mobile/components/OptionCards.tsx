import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { T } from '../theme';

export interface OptionCard {
  id: string;
  title: string;
  subtitle?: string;
}

interface Props {
  options: OptionCard[];
  onSelect: (option: OptionCard) => void;
}

export default function OptionCards({ options, onSelect }: Props) {
  if (!options.length) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.card}
            onPress={() => onSelect(option)}
            activeOpacity={0.6}
          >
            <Text style={styles.title}>{option.title}</Text>
            {option.subtitle ? (
              <Text style={styles.subtitle}>{option.subtitle}</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: T.s3,
  },
  scrollContent: {
    paddingHorizontal: T.s5,
    gap: T.s2,
  },
  card: {
    backgroundColor: T.cardBg,
    borderRadius: T.radiusSm,
    paddingVertical: T.s4,
    paddingHorizontal: T.s5,
    minWidth: 120,
    borderWidth: 1,
    borderColor: T.border,
  },
  title: {
    color: T.textPrimary,
    fontSize: T.fontBase,
    fontWeight: T.medium,
  },
  subtitle: {
    color: T.textTertiary,
    fontSize: T.fontSm,
    fontWeight: T.light,
    marginTop: T.s1,
  },
});
