import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoinRow } from '../../components/CoinRow';
import { CmcCoin, CmcCoinMapEntry, fetchCoinMap, fetchCoinQuotes } from '../../lib/coinmarketcap';
import { addSearchTerm, clearSearchHistory, getSearchHistory } from '../../lib/searchHistory';

const MAX_RESULTS = 30;
const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [coinMap, setCoinMap] = useState<CmcCoinMapEntry[]>([]);
  const [results, setResults] = useState<CmcCoin[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSearchHistory().then(setHistory);
    fetchCoinMap()
      .then(setCoinMap)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load coin list'));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const lower = trimmed.toLowerCase();
      const matches = coinMap
        .filter((c) => c.name.toLowerCase().includes(lower) || c.symbol.toLowerCase().includes(lower))
        .slice(0, MAX_RESULTS);

      if (matches.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      try {
        const quotes = await fetchCoinQuotes(matches.map((m) => m.id));
        const byId = new Map(quotes.map((c) => [c.id, c]));
        setResults(matches.map((m) => byId.get(m.id)).filter((c): c is CmcCoin => c != null));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, coinMap]);

  const runSearch = (term: string) => {
    setQuery(term);
  };

  const handleResultPress = () => {
    addSearchTerm(query).then(setHistory);
  };

  const handleCancel = () => {
    setQuery('');
    Keyboard.dismiss();
  };

  const handleClearHistory = () => {
    Alert.alert('Clear search history?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearSearchHistory();
          setHistory([]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBarRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coins"
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => Keyboard.dismiss()}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable onPress={handleCancel} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Search History</Text>
            {history.length > 0 ? (
              <Pressable onPress={handleClearHistory} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color="#666" />
              </Pressable>
            ) : null}
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>Your recent searches will show up here</Text>
          ) : (
            <View style={styles.historyChips}>
              {history.map((term) => (
                <Pressable key={term} style={styles.historyChip} onPress={() => runSearch(term)}>
                  <Text style={styles.historyChipText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : searching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={40} color="#ccc" />
          <Text style={styles.emptyTitle}>No coins found</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CoinRow coin={item} onPress={handleResultPress} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, color: '#888' },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 16, color: '#111', height: '100%' },
  cancelText: { fontSize: 16, color: '#111' },
  historySection: { paddingHorizontal: 16, paddingTop: 8 },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: { fontSize: 17, fontWeight: '700' },
  emptyHistoryText: { color: '#999', fontSize: 14 },
  historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  historyChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  historyChipText: { fontSize: 14, color: '#333' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
});
