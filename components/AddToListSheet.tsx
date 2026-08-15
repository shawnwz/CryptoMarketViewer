import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFavoriteLists } from '../contexts/FavoriteListsContext';
import { useTheme } from '../contexts/ThemeContext';
import type { CmcCoin } from '../lib/coinmarketcap';
import type { FavoriteList } from '../lib/favoriteLists';
import { ThemeColors } from '../lib/theme';
import { TextPromptModal } from './TextPromptModal';

type Props = {
  visible: boolean;
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>;
  onClose: () => void;
};

export function AddToListSheet({ visible, coin, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { lists, isInList, toggleCoinInList, createList } = useFavoriteLists();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleToggle = async (list: FavoriteList) => {
    setTogglingId(list.id);
    const { error } = await toggleCoinInList(list.id, coin);
    setTogglingId(null);
    if (error) Alert.alert(t('addToList.couldNotUpdateList'), error);
  };

  const handleCreate = async (name: string) => {
    const { list, error } = await createList(name);
    if (error) {
      Alert.alert(t('common.couldNotCreateList'), error);
    } else if (list) {
      await toggleCoinInList(list.id, coin);
    }
    setCreating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('addToList.title', { symbol: coin.symbol })}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('addToList.empty')}</Text>}
            renderItem={({ item }) => {
              const inList = isInList(item.id, coin.id);
              return (
                <Pressable style={styles.row} onPress={() => handleToggle(item)} disabled={togglingId === item.id}>
                  <Text style={styles.rowText}>{item.name}</Text>
                  {togglingId === item.id ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Ionicons
                      name={inList ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={inList ? colors.accent : colors.textFaint}
                    />
                  )}
                </Pressable>
              );
            }}
          />

          <Pressable style={styles.newListButton} onPress={() => setCreating(true)}>
            <Ionicons name="add" size={18} color={colors.accent} />
            <Text style={styles.newListButtonText}>{t('addToList.newList')}</Text>
          </Pressable>
        </View>
      </View>

      <TextPromptModal
        visible={creating}
        title={t('addToList.newList')}
        confirmLabel={t('common.create')}
        placeholder={t('favorites.listNamePlaceholder')}
        onCancel={() => setCreating(false)}
        onSubmit={handleCreate}
      />
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 32,
      maxHeight: '70%',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    list: { flexGrow: 0 },
    emptyText: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: { fontSize: 15, color: colors.text },
    newListButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16, gap: 6 },
    newListButtonText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  });
}
