import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFavoriteLists } from '../contexts/FavoriteListsContext';
import type { CmcCoin } from '../lib/coinmarketcap';
import type { FavoriteList } from '../lib/favoriteLists';
import { TextPromptModal } from './TextPromptModal';

type Props = {
  visible: boolean;
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>;
  onClose: () => void;
};

export function AddToListSheet({ visible, coin, onClose }: Props) {
  const { lists, isInList, toggleCoinInList, createList } = useFavoriteLists();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleToggle = async (list: FavoriteList) => {
    setTogglingId(list.id);
    const { error } = await toggleCoinInList(list.id, coin);
    setTogglingId(null);
    if (error) Alert.alert('Could not update list', error);
  };

  const handleCreate = async (name: string) => {
    const { list, error } = await createList(name);
    if (error) {
      Alert.alert('Could not create list', error);
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
            <Text style={styles.title}>Add {coin.symbol} to list</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#111" />
            </Pressable>
          </View>

          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No lists yet — create your first one below.</Text>
            }
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
                      color={inList ? '#2563eb' : '#ccc'}
                    />
                  )}
                </Pressable>
              );
            }}
          />

          <Pressable style={styles.newListButton} onPress={() => setCreating(true)}>
            <Ionicons name="add" size={18} color="#2563eb" />
            <Text style={styles.newListButtonText}>New list</Text>
          </Pressable>
        </View>
      </View>

      <TextPromptModal
        visible={creating}
        title="New list"
        confirmLabel="Create"
        onCancel={() => setCreating(false)}
        onSubmit={handleCreate}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  list: { flexGrow: 0 },
  emptyText: { color: '#888', textAlign: 'center', paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowText: { fontSize: 15 },
  newListButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16, gap: 6 },
  newListButtonText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
});
