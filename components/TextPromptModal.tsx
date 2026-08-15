import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../lib/theme';

type Props = {
  visible: boolean;
  title: string;
  initialValue?: string;
  confirmLabel?: string;
  placeholder?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void | Promise<void>;
};

export function TextPromptModal({
  visible,
  title,
  initialValue = '',
  confirmLabel,
  placeholder,
  onCancel,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitting(true);
    await onSubmit(trimmed);
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            keyboardAppearance={scheme}
            value={value}
            onChangeText={setValue}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            placeholder={placeholder ?? t('favorites.listNamePlaceholder')}
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, (!value.trim() || submitting) && styles.confirmButtonDisabled]}
              onPress={handleSubmit}
              disabled={!value.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel ?? t('common.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 20 },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      marginBottom: 16,
      color: colors.text,
    },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
    cancelButtonText: { color: colors.textMuted, fontWeight: '600' },
    confirmButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmButtonText: { color: colors.onAccent, fontWeight: '600' },
  });
}
