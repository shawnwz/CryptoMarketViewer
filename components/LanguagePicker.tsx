import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import type { SupportedLanguage } from '../lib/i18n';

const OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
];

export function LanguagePicker() {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.code}
          style={[styles.option, option.code === language && styles.optionSelected]}
          onPress={() => setLanguage(option.code)}
        >
          <Text style={[styles.optionText, option.code === language && styles.optionTextSelected]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  optionSelected: { backgroundColor: '#2563eb' },
  optionText: { fontSize: 13, fontWeight: '600', color: '#444' },
  optionTextSelected: { color: '#fff' },
});
