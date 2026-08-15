import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CmcCoin, fetchCoinQuotes } from '../../lib/coinmarketcap';
import { ThemeColors } from '../../lib/theme';

type PromptMode = 'create' | 'rename' | null;

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const { currency } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        const data = await fetchCoinQuotes(coinIdsInSelectedList, currency);
        const byId = new Map(data.map((coin) => [coin.id, coin]));
        setCoins(coinIdsInSelectedList.map((id) => byId.get(id)).filter((c): c is CmcCoin => c != null));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('favorites.failedToLoad'));
      } finally {
        setLoadingCoins(false);
        setRefreshing(false);
      }
    },
    [selectedListId, coinIdsInSelectedList, t, currency]
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
        text: t('favorites.rename'),
        onPress: () => {
          setSelectedListId(listId);
          setPromptMode('rename');
        },
      },
      {
        text: t('favorites.delete'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('favorites.deleteListTitle'), t('favorites.deleteListMessage', { name: list.name }), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('favorites.delete'), style: 'destructive', onPress: () => deleteList(listId) },
          ]),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handlePromptSubmit = async (value: string) => {
    if (promptMode === 'create') {
      const { list, error: createError } = await createList(value);
      if (createError) Alert.alert(t('common.couldNotCreateList'), createError);
      else if (list) setSelectedListId(list.id);
    } else if (promptMode === 'rename' && selectedListId) {
      const { error: renameError } = await renameList(selectedListId, value);
      if (renameError) Alert.alert(t('favorites.couldNotRenameList'), renameError);
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
          <Ionicons name="add" size={18} color={colors.accent} />
        </Pressable>
      </ScrollView>

      {lists.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="albums-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>{t('favorites.noListsYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('favorites.createListPrompt')}</Text>
          <Pressable style={styles.createFirstButton} onPress={() => setPromptMode('create')}>
            <Text style={styles.createFirstButtonText}>{t('favorites.createList')}</Text>
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
          <Ionicons name="star-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>{t('favorites.noCoinsInList', { name: selectedList?.name })}</Text>
          <Text style={styles.emptySubtitle}>{t('favorites.tapStarPrompt')}</Text>
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
        title={promptMode === 'rename' ? t('favorites.renameListTitle') : t('favorites.newListTitle')}
        initialValue={promptMode === 'rename' ? selectedList?.name ?? '' : ''}
        confirmLabel={promptMode === 'rename' ? t('favorites.rename') : t('common.create')}
        placeholder={t('favorites.listNamePlaceholder')}
        onCancel={() => setPromptMode(null)}
        onSubmit={handlePromptSubmit}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
    errorText: { color: colors.danger, textAlign: 'center' },
    chipsScrollView: { flexGrow: 0 },
    chipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: 'center' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.surface,
      maxWidth: 160,
    },
    chipSelected: { backgroundColor: colors.accent },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTextSelected: { color: colors.onAccent },
    addChip: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, color: colors.text },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    createFirstButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginTop: 16,
    },
    createFirstButtonText: { color: colors.onAccent, fontWeight: '600' },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  });
}
