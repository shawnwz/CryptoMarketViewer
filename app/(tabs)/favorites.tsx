import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { CoinRow } from '../../components/CoinRow';
import { useFavorites } from '../../contexts/FavoritesContext';
import { CmcCoin, fetchCoinQuotes } from '../../lib/coinmarketcap';

export default function FavoritesScreen() {
  const { favorites, loading: favoritesLoading } = useFavorites();
  const [coins, setCoins] = useState<CmcCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(
    async (isRefresh = false) => {
      if (favorites.length === 0) {
        setCoins([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const data = await fetchCoinQuotes(favorites.map((f) => f.coin_id));
        const byId = new Map(data.map((coin) => [coin.id, coin]));
        setCoins(favorites.map((f) => byId.get(f.coin_id)).filter((c): c is CmcCoin => c != null));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load favorites');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [favorites]
  );

  useEffect(() => {
    if (!favoritesLoading) {
      loadQuotes();
    }
  }, [favoritesLoading, loadQuotes]);

  if (favoritesLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (coins.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="star-outline" size={40} color="#ccc" />
        <Text style={styles.emptyTitle}>No favorites yet</Text>
        <Text style={styles.emptySubtitle}>Tap the star on any coin to add it here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={coins}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <CoinRow coin={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadQuotes(true)} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
});
