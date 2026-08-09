import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import {
  CmcCoin,
  CmcCoinInfo,
  fetchCoinInfo,
  fetchCoinQuote,
  getUsdQuote,
} from '../../lib/coinmarketcap';
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatDate,
  formatPercent,
  formatPrice,
} from '../../lib/format';

type LinkItem = { label: string; url: string; icon: keyof typeof Ionicons.glyphMap };

function getLinkItems(info: CmcCoinInfo): LinkItem[] {
  const items: LinkItem[] = [];
  if (info.urls.website[0]) items.push({ label: 'Website', url: info.urls.website[0], icon: 'globe-outline' });
  if (info.urls.explorer[0]) items.push({ label: 'Explorer', url: info.urls.explorer[0], icon: 'compass-outline' });
  if (info.urls.source_code[0])
    items.push({ label: 'Source code', url: info.urls.source_code[0], icon: 'logo-github' });
  if (info.urls.technical_doc[0])
    items.push({ label: 'Whitepaper', url: info.urls.technical_doc[0], icon: 'document-text-outline' });
  if (info.urls.reddit[0]) items.push({ label: 'Reddit', url: info.urls.reddit[0], icon: 'logo-reddit' });
  if (info.twitter_username) {
    items.push({ label: 'Twitter', url: `https://twitter.com/${info.twitter_username}`, icon: 'logo-twitter' });
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const coinId = Number(id);

  const [coin, setCoin] = useState<CmcCoin | null>(null);
  const [info, setInfo] = useState<CmcCoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [quoteResult, infoResult] = await Promise.all([fetchCoinQuote(coinId), fetchCoinInfo(coinId)]);
        if (cancelled) return;
        setCoin(quoteResult);
        setInfo(infoResult);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load coin');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [coinId]);

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
        <Text style={styles.errorText}>{error ?? 'Coin not found'}</Text>
      </View>
    );
  }

  const quote = getUsdQuote(coin);
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
            {coin.symbol} · Rank #{coin.cmc_rank}
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

      {quote ? (
        <View style={styles.statsGrid}>
          <StatRow label="Market cap" value={formatCompactCurrency(quote.market_cap)} />
          <StatRow label="Market cap dominance" value={`${quote.market_cap_dominance.toFixed(2)}%`} />
          <StatRow label="Fully diluted market cap" value={formatCompactCurrency(quote.fully_diluted_market_cap)} />
          <StatRow
            label="Volume (24h)"
            value={`${formatCompactCurrency(quote.volume_24h)} (${formatPercent(quote.volume_change_24h)})`}
          />
          <StatRow label="Circulating supply" value={`${formatCompactNumber(coin.circulating_supply)} ${coin.symbol}`} />
          <StatRow label="Total supply" value={`${formatCompactNumber(coin.total_supply)} ${coin.symbol}`} />
          {coin.max_supply != null ? (
            <StatRow label="Max supply" value={`${formatCompactNumber(coin.max_supply)} ${coin.symbol}`} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About {coin.name}</Text>
        <Text style={styles.description}>{info.description}</Text>
        <Text style={styles.dateAdded}>Added {formatDate(info.date_added)}</Text>

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
          <Text style={styles.sectionTitle}>Links</Text>
          {links.map((link) => (
            <Pressable key={link.label} style={styles.linkRow} onPress={() => Linking.openURL(link.url)}>
              <Ionicons name={link.icon} size={20} color="#2563eb" />
              <Text style={styles.linkLabel}>{link.label}</Text>
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
