import { Link } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LanguagePicker } from '../../components/LanguagePicker';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../lib/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setError(error);
  };

  return (
    <View style={styles.container}>
      <View style={styles.languageRow}>
        <LanguagePicker />
      </View>
      <Text style={styles.title}>{t('auth.logIn')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor={colors.textMuted}
        keyboardAppearance={scheme}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        placeholderTextColor={colors.textMuted}
        keyboardAppearance={scheme}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.buttonText}>{t('auth.logIn')}</Text>
        )}
      </Pressable>

      <Link href="/(auth)/signup" asChild>
        <Pressable>
          <Text style={styles.link}>{t('auth.noAccount')}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    languageRow: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', marginBottom: 24, textAlign: 'center', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
    error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
    link: { color: colors.accent, textAlign: 'center', marginTop: 16 },
  });
}
