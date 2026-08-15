import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { CmcCoin, fetchCoinQuotes, getCoinLogoUrl, getQuote } from '../../lib/coinmarketcap';
import { formatCompactCurrency, formatPercent, formatPrice } from '../../lib/format';
import { deleteHolding, Holding, listHoldings, upsertHolding } from '../../lib/portfolio';
import { ThemeColors } from '../../lib/theme';

type EnrichedHolding = Holding & { coin: CmcCoin | null };

function HoldingRow({ holding, onPress }: { holding: EnrichedHolding; onPress: () => void }) {
  const { currency } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const quote = holding.coin ? getQuote(holding.coin, currency) : undefined;
  const value = quote ? quote.price * holding.quantity : null;
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {logoFailed ? (
        <View style={styles.logoFallback}>
          <Text style={styles.logoFallbackText}>{holding.symbol.charAt(0)}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: getCoinLogoUrl(holding.coin_id) }}
          style={styles.logo}
          onError={() => setLogoFailed(true)}
        />
      )}
      <View style={styles.nameColumn}>
        <Text style={styles.name} numberOfLines={1}>
          {holding.name}
        </Text>
        <Text style={styles.quantity}>
          {holding.quantity} {holding.symbol}
        </Text>
      </View>
      <View style={styles.valueColumn}>
        <Text style={styles.value}>{value != null ? formatPrice(value) : '—'}</Text>
        {quote ? (
          <Text style={[styles.change, quote.percent_change_24h >= 0 ? styles.positive : styles.negative]}>
            {formatPercent(quote.percent_change_24h)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function EditHoldingModal({
  holding,
  onCancel,
  onSave,
  onDelete,
}: {
  holding: Holding | null;
  onCancel: () => void;
  onSave: (quantity: number) => Promise<void>;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (holding) setQuantity(String(holding.quantity));
  }, [holding]);

  const handleSave = async () => {
    const parsed = Number(quantity);
    if (!quantity.trim() || Number.isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('portfolio.enterValidQuantity'));
      return;
    }
    setSaving(true);
    await onSave(parsed);
    setSaving(false);
  };

  const handleDeletePress = () => {
    Alert.alert(t('portfolio.removeHoldingTitle'), t('portfolio.removeHoldingMessage', { name: holding?.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('portfolio.remove'), style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Modal visible={holding != null} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{holding?.name}</Text>
          <TextInput
            style={styles.quantityInput}
            placeholderTextColor={colors.textMuted}
            keyboardAppearance={scheme}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder={t('portfolio.quantityPlaceholder')}
            autoFocus
          />
          <View style={styles.cardButtonRow}>
            <Pressable onPress={handleDeletePress}>
              <Text style={styles.deleteButtonText}>{t('portfolio.remove')}</Text>
            </Pressable>
            <View style={styles.cardButtonRowRight}>
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PortfolioScreen() {
  const { t } = useTranslation();
  const { currency } = useLanguage();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Map<number, CmcCoin>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const holdingsData = await listHoldings();
        setHoldings(holdingsData);
        if (holdingsData.length > 0) {
          const quotesData = await fetchCoinQuotes(
            holdingsData.map((h) => h.coin_id),
            currency
          );
          setQuotes(new Map(quotesData.map((c) => [c.id, c])));
        } else {
          setQuotes(new Map());
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('portfolio.failedToLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, currency]
  );

  // Refetches every time this tab regains focus (not just on first mount),
  // so returning from the "Add holding" modal shows the new coin immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const enriched: EnrichedHolding[] = holdings.map((h) => ({ ...h, coin: quotes.get(h.coin_id) ?? null }));

  const totalValue = enriched.reduce((sum, h) => {
    const quote = h.coin ? getQuote(h.coin, currency) : undefined;
    return sum + (quote ? quote.price * h.quantity : 0);
  }, 0);

  const handleSaveQuantity = async (quantity: number) => {
    if (!editingHolding) return;
    const coin = quotes.get(editingHolding.coin_id);
    if (!coin) return;
    try {
      await upsertHolding(coin, quantity);
      setEditingHolding(null);
      load();
    } catch (e) {
      Alert.alert(t('portfolio.couldNotUpdateHolding'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    }
  };

  const handleDelete = async () => {
    if (!editingHolding) return;
    try {
      await deleteHolding(editingHolding.coin_id);
      setEditingHolding(null);
      load();
    } catch (e) {
      Alert.alert(t('portfolio.couldNotDeleteHolding'), e instanceof Error ? e.message : t('common.somethingWentWrong'));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>{t('portfolio.totalValue')}</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalValue}>{formatCompactCurrency(totalValue)}</Text>
          <Pressable onPress={() => load(true)} hitSlop={10} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : enriched.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="wallet-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyTitle}>{t('portfolio.noHoldingsYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('portfolio.addCoinPrompt')}</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={enriched}
          keyExtractor={(item) => String(item.coin_id)}
          renderItem={({ item }) => <HoldingRow holding={item} onPress={() => setEditingHolding(item)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        />
      )}

      <Pressable style={styles.addButton} onPress={() => router.push('/portfolio/add')}>
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </Pressable>

      <EditHoldingModal
        holding={editingHolding}
        onCancel={() => setEditingHolding(null)}
        onSave={handleSaveQuantity}
        onDelete={handleDelete}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
    errorText: { color: colors.danger, textAlign: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12, color: colors.text },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    totalSection: { padding: 16 },
    totalLabel: { fontSize: 13, color: colors.textMuted },
    totalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    totalValue: { fontSize: 32, fontWeight: '700', color: colors.text },
    refreshButton: { marginLeft: 12, padding: 4 },
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
    quantity: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    valueColumn: { alignItems: 'flex-end' },
    value: { fontSize: 15, fontWeight: '600', color: colors.text },
    change: { fontSize: 13, marginTop: 2 },
    positive: { color: colors.success },
    negative: { color: colors.danger },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
    addButton: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 20 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.text },
    quantityInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      marginBottom: 16,
      color: colors.text,
    },
    cardButtonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deleteButtonText: { color: colors.danger, fontWeight: '600' },
    cardButtonRowRight: { flexDirection: 'row', gap: 12 },
    cancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
    cancelButtonText: { color: colors.textMuted, fontWeight: '600' },
    saveButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: colors.onAccent, fontWeight: '600' },
  });
}
