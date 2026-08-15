import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CmcCoin, CmcCoinMapEntry, fetchCoinMap, fetchCoinQuotes } from '../../lib/coinmarketcap';
import { addSearchTerm, clearSearchHistory, getSearchHistory } from '../../lib/searchHistory';
import { ThemeColors } from '../../lib/theme';

const MAX_RESULTS = 30;
const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const { t } = useTranslation();
  const { currency } = useLanguage();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      .catch((e) => setError(e instanceof Error ? e.message : t('common.failedToLoadCoinList')));
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
        const quotes = await fetchCoinQuotes(matches.map((m) => m.id), currency);
        const byId = new Map(quotes.map((c) => [c.id, c]));
        setResults(matches.map((m) => byId.get(m.id)).filter((c): c is CmcCoin => c != null));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.searchFailed'));
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, coinMap, currency]);

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
    Alert.alert(t('search.clearHistoryTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('search.clear'),
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
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.searchCoinsPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardAppearance={scheme}
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
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>

      {query.trim().length === 0 ? (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{t('search.searchHistory')}</Text>
            {history.length > 0 ? (
              <Pressable onPress={handleClearHistory} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>{t('search.recentSearchesEmpty')}</Text>
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
          <Ionicons name="search-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>{t('common.noCoinsFound')}</Text>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
    errorText: { color: colors.danger, textAlign: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, color: colors.textMuted },
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
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
    },
    searchIcon: { marginRight: 6 },
    searchInput: { flex: 1, fontSize: 16, color: colors.text, height: '100%' },
    cancelText: { fontSize: 16, color: colors.text },
    historySection: { paddingHorizontal: 16, paddingTop: 8 },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    historyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    emptyHistoryText: { color: colors.textMuted, fontSize: 14 },
    historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    historyChip: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    historyChipText: { fontSize: 14, color: colors.text },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  });
}
