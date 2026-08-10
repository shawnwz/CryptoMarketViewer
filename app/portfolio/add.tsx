import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { CmcCoin, CmcCoinMapEntry, fetchCoinMap, fetchCoinQuotes, getCoinLogoUrl, getQuote } from '../../lib/coinmarketcap';
import { formatPrice } from '../../lib/format';
import { upsertHolding } from '../../lib/portfolio';

const MAX_RESULTS = 30;
const DEBOUNCE_MS = 300;

// A plain, non-navigating row for picking a coin — CoinRow always links to the
// coin detail screen, which isn't what we want while selecting one to add.
function PickableCoinRow({ coin, onPress }: { coin: CmcCoin; onPress: () => void }) {
  const { currency } = useLanguage();
  const quote = getQuote(coin, currency);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {logoFailed ? (
        <View style={styles.logoFallback}>
          <Text style={styles.logoFallbackText}>{coin.symbol.charAt(0)}</Text>
        </View>
      ) : (
        <Image source={{ uri: getCoinLogoUrl(coin.id) }} style={styles.logo} onError={() => setLogoFailed(true)} />
      )}
      <View style={styles.nameColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {coin.name}
        </Text>
        <Text style={styles.symbol}>{coin.symbol}</Text>
      </View>
      <Text style={styles.price}>{quote ? formatPrice(quote.price) : '—'}</Text>
    </Pressable>
  );
}

export default function AddHoldingScreen() {
  const { t } = useTranslation();
  const { currency } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [coinMap, setCoinMap] = useState<CmcCoinMapEntry[]>([]);
  const [results, setResults] = useState<CmcCoin[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<CmcCoin | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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

  const handleSave = async () => {
    if (!selectedCoin) return;
    const parsed = Number(quantity);
    if (!quantity.trim() || Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('portfolio.enterValidQuantity'));
      return;
    }
    setSaving(true);
    try {
      await upsertHolding(selectedCoin, parsed);
      router.back();
    } catch (e) {
      Alert.alert(t('portfolio.couldNotAddHolding'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: selectedCoin ? t('portfolio.enterQuantity') : t('portfolio.addHolding'),
          headerLeft: () =>
            selectedCoin ? (
              <Pressable onPress={() => setSelectedCoin(null)} hitSlop={8}>
                <Ionicons name="chevron-back" size={24} color="#2563eb" />
              </Pressable>
            ) : (
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="close" size={22} color="#111" />
              </Pressable>
            ),
        }}
      />

      {selectedCoin ? (
        <View style={styles.quantityForm}>
          <Text style={styles.selectedCoinName}>
            {selectedCoin.name} ({selectedCoin.symbol})
          </Text>
          <TextInput
            style={styles.quantityInput}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder={t('portfolio.quantityPlaceholder')}
            autoFocus
          />
          <Pressable
            style={[styles.saveButton, (saving || !quantity.trim()) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || !quantity.trim()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('portfolio.addToPortfolio')}</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.searchBarRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.searchCoinsPlaceholder')}
                placeholderTextColor="#999"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
            </View>
          </View>

          {searching ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : query.trim().length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="search-outline" size={40} color="#ccc" />
              <Text style={styles.emptyTitle}>{t('portfolio.searchForCoinToAdd')}</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{t('common.noCoinsFound')}</Text>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={results}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <PickableCoinRow coin={item} onPress={() => setSelectedCoin(item)} />}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, color: '#888', textAlign: 'center' },
  searchBarRow: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 16, color: '#111', height: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  logo: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0f0f0' },
  logoFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: { fontSize: 12, fontWeight: '700', color: '#888' },
  nameColumn: { flex: 1, marginLeft: 10 },
  name: { fontSize: 15, fontWeight: '600' },
  symbol: { fontSize: 13, color: '#888', marginTop: 2 },
  price: { fontSize: 15, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
  quantityForm: { padding: 16 },
  selectedCoinName: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
