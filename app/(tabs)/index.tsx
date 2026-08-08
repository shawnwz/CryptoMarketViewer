import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CmcCoin, fetchCoinListings, getUsdQuote } from '../../lib/coinmarketcap';

const PAGE_SIZE = 10;

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  });
}

function formatPercent(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
}

function CoinRow({ coin }: { coin: CmcCoin }) {
  const quote = getUsdQuote(coin);

  return (
    <View style={styles.row}>
      <Text style={styles.rank}>{coin.cmc_rank}</Text>
      <View style={styles.nameColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {coin.name}
        </Text>
        <Text style={styles.symbol}>{coin.symbol}</Text>
      </View>
      <View style={styles.priceColumn}>
        <Text style={styles.price}>{quote ? formatPrice(quote.price) : '—'}</Text>
        {quote ? (
          <Text style={[styles.change, quote.percent_change_24h >= 0 ? styles.positive : styles.negative]}>
            {formatPercent(quote.percent_change_24h)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function MarketScreen() {
  const [coins, setCoins] = useState<CmcCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextStartRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    nextStartRef.current = 1;
    try {
      const data = await fetchCoinListings({ start: 1, limit: PAGE_SIZE });
      setCoins(data);
      setHasMore(data.length === PAGE_SIZE);
      nextStartRef.current = 1 + data.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cryptocurrencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchCoinListings({ start: nextStartRef.current, limit: PAGE_SIZE });
      setCoins((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      nextStartRef.current += data.length;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more cryptocurrencies');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loading]);

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
        <Pressable style={styles.retryButton} onPress={loadInitial}>
          <Text style={styles.retryButtonText}>Retry</Text>
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
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator />
          </View>
        ) : null
      }
      contentContainerStyle={coins.length === 0 ? styles.center : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  rank: { width: 28, fontSize: 13, color: '#999' },
  nameColumn: { flex: 1, marginLeft: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  symbol: { fontSize: 13, color: '#888', marginTop: 2 },
  priceColumn: { alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '600' },
  change: { fontSize: 13, marginTop: 2 },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
  footer: { paddingVertical: 20 },
});
