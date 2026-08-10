import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CoinRow } from '../../components/CoinRow';
import { TextPromptModal } from '../../components/TextPromptModal';
import { useFavoriteLists } from '../../contexts/FavoriteListsContext';
import { CmcCoin, fetchCoinQuotes } from '../../lib/coinmarketcap';

type PromptMode = 'create' | 'rename' | null;

export default function FavoritesScreen() {
  const { lists, listCoins, loading: listsLoading, createList, renameList, deleteList } = useFavoriteLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [coins, setCoins] = useState<CmcCoin[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<PromptMode>(null);
  const chipsScrollRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [chipsViewportWidth, setChipsViewportWidth] = useState(0);

  // Keep the selection valid as lists load in or get deleted.
  useEffect(() => {
    if (lists.length === 0) {
      setSelectedListId(null);
    } else if (!selectedListId || !lists.some((l) => l.id === selectedListId)) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  // Bring the selected chip fully into view (centered where possible) so
  // tapping a chip near the edge reveals whether there are more beyond it,
  // instead of relying on the user discovering they can swipe further.
  useEffect(() => {
    if (!selectedListId || !chipsViewportWidth) return;
    const layout = chipLayouts.current[selectedListId];
    if (!layout) return;
    const targetX = layout.x - (chipsViewportWidth - layout.width) / 2;
    chipsScrollRef.current?.scrollTo({ x: Math.max(0, targetX), animated: true });
  }, [selectedListId, chipsViewportWidth]);

  const coinIdsInSelectedList = useMemo(
    () => listCoins.filter((c) => c.list_id === selectedListId).map((c) => c.coin_id),
    [listCoins, selectedListId]
  );

  const loadCoins = useCallback(
    async (isRefresh = false) => {
      if (!selectedListId || coinIdsInSelectedList.length === 0) {
        setCoins([]);
        setLoadingCoins(false);
        setRefreshing(false);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoadingCoins(true);
      setError(null);
      try {
        const data = await fetchCoinQuotes(coinIdsInSelectedList);
        const byId = new Map(data.map((coin) => [coin.id, coin]));
        setCoins(coinIdsInSelectedList.map((id) => byId.get(id)).filter((c): c is CmcCoin => c != null));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load favorites');
      } finally {
        setLoadingCoins(false);
        setRefreshing(false);
      }
    },
    [selectedListId, coinIdsInSelectedList]
  );

  useEffect(() => {
    if (!listsLoading) loadCoins();
  }, [listsLoading, loadCoins]);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;

  const handleLongPressChip = (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    Alert.alert(list.name, undefined, [
      {
        text: 'Rename',
        onPress: () => {
          setSelectedListId(listId);
          setPromptMode('rename');
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete list?', `This removes "${list.name}" and its saved coins.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteList(listId) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePromptSubmit = async (value: string) => {
    if (promptMode === 'create') {
      const { list, error: createError } = await createList(value);
      if (createError) Alert.alert('Could not create list', createError);
      else if (list) setSelectedListId(list.id);
    } else if (promptMode === 'rename' && selectedListId) {
      const { error: renameError } = await renameList(selectedListId, value);
      if (renameError) Alert.alert('Could not rename list', renameError);
    }
    setPromptMode(null);
  };

  if (listsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={chipsScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        contentInsetAdjustmentBehavior="never"
        style={styles.chipsScrollView}
        onLayout={(e) => setChipsViewportWidth(e.nativeEvent.layout.width)}
      >
        {lists.map((list) => (
          <Pressable
            key={list.id}
            style={[styles.chip, list.id === selectedListId && styles.chipSelected]}
            onPress={() => setSelectedListId(list.id)}
            onLongPress={() => handleLongPressChip(list.id)}
            onLayout={(e) => {
              chipLayouts.current[list.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
            }}
          >
            <Text style={[styles.chipText, list.id === selectedListId && styles.chipTextSelected]} numberOfLines={1}>
              {list.name}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.addChip} onPress={() => setPromptMode('create')}>
          <Ionicons name="add" size={18} color="#2563eb" />
        </Pressable>
      </ScrollView>

      {lists.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="albums-outline" size={40} color="#ccc" />
          <Text style={styles.emptyTitle}>No lists yet</Text>
          <Text style={styles.emptySubtitle}>Create a list to start saving coins</Text>
          <Pressable style={styles.createFirstButton} onPress={() => setPromptMode('create')}>
            <Text style={styles.createFirstButtonText}>Create a list</Text>
          </Pressable>
        </View>
      ) : loadingCoins ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : coins.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="star-outline" size={40} color="#ccc" />
          <Text style={styles.emptyTitle}>No coins in &quot;{selectedList?.name}&quot;</Text>
          <Text style={styles.emptySubtitle}>Tap the star on any coin to add it here</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentInsetAdjustmentBehavior="never"
          data={coins}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CoinRow coin={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCoins(true)} />}
        />
      )}

      <TextPromptModal
        visible={promptMode != null}
        title={promptMode === 'rename' ? 'Rename list' : 'New list'}
        initialValue={promptMode === 'rename' ? selectedList?.name ?? '' : ''}
        confirmLabel={promptMode === 'rename' ? 'Rename' : 'Create'}
        onCancel={() => setPromptMode(null)}
        onSubmit={handlePromptSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  chipsScrollView: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    maxWidth: 160,
  },
  chipSelected: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#444' },
  chipTextSelected: { color: '#fff' },
  addChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
  createFirstButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, marginTop: 16 },
  createFirstButtonText: { color: '#fff', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
});
