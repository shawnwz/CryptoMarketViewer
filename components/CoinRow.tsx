import { Link } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { CmcCoin, getCoinLogoUrl, getQuote } from '../lib/coinmarketcap';
import { formatPercent, formatPrice } from '../lib/format';
import { ThemeColors } from '../lib/theme';
import { FavoriteButton } from './FavoriteButton';

export function CoinRow({ coin, onPress }: { coin: CmcCoin; onPress?: () => void }) {
  const { currency } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const quote = getQuote(coin, currency);
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    logo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface },
    logoFallback: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoFallbackText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    nameColumn: { flex: 1, marginLeft: 10 },
    name: { fontSize: 15, fontWeight: '600', color: colors.text },
    symbol: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    priceColumn: { alignItems: 'flex-end' },
    price: { fontSize: 15, fontWeight: '600', color: colors.text },
    change: { fontSize: 13, marginTop: 2 },
    positive: { color: colors.success },
    negative: { color: colors.danger },
    star: { marginLeft: 12, padding: 4 },
  });
}
