import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../lib/theme';
import { ThemePreference, useTheme } from '../contexts/ThemeContext';

const OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'theme.system' },
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
];

export function ThemePicker() {
  const { t } = useTranslation();
  const { preference, colors, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.option, option.value === preference && styles.optionSelected]}
          onPress={() => setPreference(option.value)}
        >
          <Text style={[styles.optionText, option.value === preference && styles.optionTextSelected]}>
            {t(option.labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    option: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    optionSelected: { backgroundColor: colors.accent },
    optionText: { fontSize: 13, fontWeight: '600', color: colors.text },
    optionTextSelected: { color: colors.onAccent },
  });
}
