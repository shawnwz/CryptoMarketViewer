import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void | Promise<void>;
};

export function TextPromptModal({
  visible,
  title,
  initialValue = '',
  confirmLabel = 'Save',
  onCancel,
  onSubmit,
}: Props) {
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
            value={value}
            onChangeText={setValue}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            placeholder="List name"
          />
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, (!value.trim() || submitting) && styles.confirmButtonDisabled]}
              onPress={handleSubmit}
              disabled={!value.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  confirmButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#fff', fontWeight: '600' },
});
