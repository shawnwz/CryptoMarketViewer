import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FavoriteButton } from '../../components/FavoriteButton';
import { PriceChart } from '../../components/PriceChart';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CmcCoin,
  CmcCoinInfo,
  CmcHistoricalPoint,
  fetchCoinHistory,
  fetchCoinInfo,
  fetchCoinQuote,
  getQuote,
} from '../../lib/coinmarketcap';
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatDate,
  formatPercent,
  formatPrice,
} from '../../lib/format';

type LinkItem = { labelKey: string; url: string; icon: keyof typeof Ionicons.glyphMap };

const RANGES: { label: string; interval: 'hourly' | 'daily'; count: number }[] = [
  { label: '1D', interval: 'hourly', count: 24 },
  { label: '7D', interval: 'daily', count: 7 },
  { label: '30D', interval: 'daily', count: 30 },
  { label: '90D', interval: 'daily', count: 90 },
  { label: '1Y', interval: 'daily', count: 365 },
];

function getLinkItems(info: CmcCoinInfo): LinkItem[] {
  const items: LinkItem[] = [];
  if (info.urls.website[0]) items.push({ labelKey: 'coin.website', url: info.urls.website[0], icon: 'globe-outline' });
  if (info.urls.explorer[0])
    items.push({ labelKey: 'coin.explorer', url: info.urls.explorer[0], icon: 'compass-outline' });
  if (info.urls.source_code[0])
    items.push({ labelKey: 'coin.sourceCode', url: info.urls.source_code[0], icon: 'logo-github' });
  if (info.urls.technical_doc[0])
    items.push({ labelKey: 'coin.whitepaper', url: info.urls.technical_doc[0], icon: 'document-text-outline' });
  if (info.urls.reddit[0]) items.push({ labelKey: 'coin.reddit', url: info.urls.reddit[0], icon: 'logo-reddit' });
  if (info.twitter_username) {
    items.push({
      labelKey: 'coin.twitter',
      url: `https://twitter.com/${info.twitter_username}`,
      icon: 'logo-twitter',
    });
  }
  return items;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function CoinDetailScreen() {
  const { t } = useTranslation();
  const { currency } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const coinId = Number(id);

  const [coin, setCoin] = useState<CmcCoin | null>(null);
  const [info, setInfo] = useState<CmcCoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rangeIndex, setRangeIndex] = useState(1); // default to 7D
  const [history, setHistory] = useState<CmcHistoricalPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [quoteResult, infoResult] = await Promise.all([
          fetchCoinQuote(coinId, currency),
          fetchCoinInfo(coinId),
        ]);
        if (cancelled) return;
        setCoin(quoteResult);
        setInfo(infoResult);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('coin.notFound'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [coinId, currency]);

  useEffect(() => {
    let cancelled = false;
    const range = RANGES[rangeIndex];

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const data = await fetchCoinHistory({
          id: coinId,
          interval: range.interval,
          count: range.count,
          convert: currency,
        });
        if (!cancelled) setHistory(data);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [coinId, rangeIndex, currency]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !coin || !info) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? t('coin.notFound')}</Text>
      </View>
    );
  }

  const quote = getQuote(coin, currency);
  const links = getLinkItems(info);
  const changeItems = quote
    ? [
        { label: '1h', value: quote.percent_change_1h },
        { label: '24h', value: quote.percent_change_24h },
        { label: '7d', value: quote.percent_change_7d },
        { label: '30d', value: quote.percent_change_30d },
        { label: '60d', value: quote.percent_change_60d },
        { label: '90d', value: quote.percent_change_90d },
      ]
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: coin.name,
          headerRight: () => <FavoriteButton coin={coin} style={styles.favoriteButton} />,
        }}
      />

      <View style={styles.header}>
        <Image source={{ uri: info.logo }} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{coin.name}</Text>
          <Text style={styles.symbol}>
            {coin.symbol} · {t('coin.rank', { rank: coin.cmc_rank })}
          </Text>
        </View>
      </View>

      {quote ? (
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{formatPrice(quote.price)}</Text>
          <Text
            style={[styles.priceChange, quote.percent_change_24h >= 0 ? styles.positive : styles.negative]}
          >
            {formatPercent(quote.percent_change_24h)} (24h)
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.changeRow}>
        {changeItems.map((item) => (
          <View key={item.label} style={styles.changeItem}>
            <Text style={styles.changeLabel}>{item.label}</Text>
            <Text style={[styles.changeValue, item.value >= 0 ? styles.positive : styles.negative]}>
              {formatPercent(item.value)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.chartSection}>
        {historyLoading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator />
          </View>
        ) : (
          <PriceChart data={history} />
        )}
        <View style={styles.rangeRow}>
          {RANGES.map((range, index) => (
            <Pressable
              key={range.label}
              style={[styles.rangeButton, index === rangeIndex && styles.rangeButtonSelected]}
              onPress={() => setRangeIndex(index)}
            >
              <Text style={[styles.rangeButtonText, index === rangeIndex && styles.rangeButtonTextSelected]}>
                {range.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {quote ? (
        <View style={styles.statsGrid}>
          <StatRow label={t('coin.marketCap')} value={formatCompactCurrency(quote.market_cap)} />
          <StatRow label={t('coin.marketCapDominance')} value={`${quote.market_cap_dominance.toFixed(2)}%`} />
          <StatRow
            label={t('coin.fullyDilutedMarketCap')}
            value={formatCompactCurrency(quote.fully_diluted_market_cap)}
          />
          <StatRow
            label={t('coin.volume24h')}
            value={`${formatCompactCurrency(quote.volume_24h)} (${formatPercent(quote.volume_change_24h)})`}
          />
          <StatRow
            label={t('coin.circulatingSupply')}
            value={`${formatCompactNumber(coin.circulating_supply)} ${coin.symbol}`}
          />
          <StatRow
            label={t('coin.totalSupply')}
            value={`${formatCompactNumber(coin.total_supply)} ${coin.symbol}`}
          />
          {coin.max_supply != null ? (
            <StatRow
              label={t('coin.maxSupply')}
              value={`${formatCompactNumber(coin.max_supply)} ${coin.symbol}`}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('coin.about', { name: coin.name })}</Text>
        <Text style={styles.description}>{info.description}</Text>
        <Text style={styles.dateAdded}>{t('coin.added', { date: formatDate(info.date_added) })}</Text>

        {info.tags.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {info.tags.slice(0, 8).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {links.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('coin.links')}</Text>
          {links.map((link) => (
            <Pressable key={link.labelKey} style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
              <Ionicons name={link.icon} size={20} color="#2563eb" />
              <Text style={styles.linkLabel}>{t(link.labelKey)}</Text>
              <Ionicons name="open-outline" size={16} color="#999" />
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  favoriteButton: { marginRight: 16, padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logo: { width: 48, height: 48, borderRadius: 24 },
  headerText: { marginLeft: 12 },
  name: { fontSize: 20, fontWeight: '700' },
  symbol: { fontSize: 13, color: '#888', marginTop: 2 },
  priceBlock: { marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '700' },
  priceChange: { fontSize: 15, marginTop: 4 },
  changeRow: { marginBottom: 16 },
  changeItem: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  changeLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  changeValue: { fontSize: 13, fontWeight: '600' },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  chartSection: { marginBottom: 24 },
  chartLoading: { height: 180, alignItems: 'center', justifyContent: 'center' },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  rangeButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rangeButtonSelected: { backgroundColor: '#eef2ff' },
  rangeButtonText: { fontSize: 13, fontWeight: '600', color: '#888' },
  rangeButtonTextSelected: { color: '#2563eb' },
  statsGrid: {
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  statLabel: { fontSize: 14, color: '#666' },
  statValue: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, color: '#333' },
  dateAdded: { fontSize: 13, color: '#888', marginTop: 8 },
  tagsRow: { marginTop: 12 },
  tag: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  tagText: { fontSize: 12, color: '#4338ca' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  linkLabel: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '500' },
});
