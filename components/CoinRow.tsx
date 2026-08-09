import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CmcCoin, getUsdQuote } from '../lib/coinmarketcap';
import { formatPercent, formatPrice } from '../lib/format';
import { FavoriteButton } from './FavoriteButton';

export function CoinRow({ coin }: { coin: CmcCoin }) {
  const quote = getUsdQuote(coin);

  return (
    <Link href={`/coin/${coin.id}`} asChild>
      <Pressable style={styles.row}>
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
  rank: { width: 28, fontSize: 13, color: '#999' },
  nameColumn: { flex: 1, marginLeft: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  symbol: { fontSize: 13, color: '#888', marginTop: 2 },
  priceColumn: { alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '600' },
  change: { fontSize: 13, marginTop: 2 },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  star: { marginLeft: 12, padding: 4 },
});
