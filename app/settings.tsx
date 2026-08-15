import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LanguagePicker } from '../components/LanguagePicker';
import { ThemePicker } from '../components/ThemePicker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../lib/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('settings.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Text style={styles.text}>{t('settings.loggedInAs', { email: user?.email })}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>{t('settings.logOut')}</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <LanguagePicker />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settings.appearance')}</Text>
        <ThemePicker />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 40, backgroundColor: colors.background },
    text: { fontSize: 16, marginBottom: 24, color: colors.text },
    button: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
    buttonText: { color: colors.onAccent, fontWeight: '600' },
    closeButton: { marginLeft: 16, padding: 4 },
    section: { marginTop: 40, alignItems: 'center', width: '100%' },
    sectionLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  });
}
