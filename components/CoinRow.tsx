import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CmcCoin, getCoinLogoUrl, getUsdQuote } from '../lib/coinmarketcap';
import { formatPercent, formatPrice } from '../lib/format';
import { FavoriteButton } from './FavoriteButton';

export function CoinRow({ coin, onPress }: { coin: CmcCoin; onPress?: () => void }) {
  const quote = getUsdQuote(coin);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Link href={`/coin/${coin.id}`} onPress={onPress} asChild>
      <Pressable style={styles.row}>
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
        <View style={styles.priceColumn}>
          <Text style={styles.price}>{quote ? formatPrice(quote.price) : '—'}</Text>
          {quote ? (
            <Text style={[styles.change, quote.percent_change_24h >= 0 ? styles.positive : styles.negative]}>
              {formatPercent(quote.percent_change_24h)}
            </Text>
          ) : null}
        </View>
        <FavoriteButton coin={coin} size={20} style={styles.star} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
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
  priceColumn: { alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '600' },
  change: { fontSize: 13, marginTop: 2 },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  star: { marginLeft: 12, padding: 4 },
});
