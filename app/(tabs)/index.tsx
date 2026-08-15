import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { CoinRow } from '../../components/CoinRow';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CmcCoin, fetchCoinListings } from '../../lib/coinmarketcap';
import { ThemeColors } from '../../lib/theme';

const PAGE_SIZE = 10;

export default function MarketScreen() {
  const { t } = useTranslation();
  const { currency } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [coins, setCoins] = useState<CmcCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextStartRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const loadInitial = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    nextStartRef.current = 1;
    try {
      const data = await fetchCoinListings({ start: 1, limit: PAGE_SIZE, convert: currency });
      setCoins(data);
      setHasMore(data.length === PAGE_SIZE);
      nextStartRef.current = 1 + data.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('market.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, currency]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchCoinListings({ start: nextStartRef.current, limit: PAGE_SIZE, convert: currency });
      setCoins((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      nextStartRef.current += data.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('market.failedToLoadMore'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loading, t, currency]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && coins.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadInitial()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={coins}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <CoinRow coin={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInitial(true)} />}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator />
          </View>
        ) : null
      }
      contentContainerStyle={coins.length === 0 ? styles.center : undefined}
      style={styles.list}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: { backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
    errorText: { color: colors.danger, textAlign: 'center', marginBottom: 16 },
    retryButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
    retryButtonText: { color: colors.onAccent, fontWeight: '600' },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
    footer: { paddingVertical: 20 },
  });
}
