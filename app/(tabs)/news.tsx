import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { formatShortDate } from '../../lib/format';
import { fetchNews, NewsArticle } from '../../lib/news';
import { ThemeColors } from '../../lib/theme';

// The API key's trial plan caps `items` at 3 per request (confirmed live —
// anything higher returns a 403), so we page in chunks of 3 instead of 10.
const PAGE_SIZE = 3;

const SENTIMENT_KEYS: Record<string, string> = {
  Positive: 'news.sentimentPositive',
  Negative: 'news.sentimentNegative',
  Neutral: 'news.sentimentNeutral',
};

function NewsCard({ article }: { article: NewsArticle }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.card} onPress={() => Linking.openURL(article.news_url)}>
      {article.image_url ? <Image source={{ uri: article.image_url }} style={styles.image} /> : null}
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={3}>
          {article.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.source} numberOfLines={1}>
            {article.source_name}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.date}>{formatShortDate(article.date)}</Text>
          <Text
            style={[
              styles.sentiment,
              article.sentiment === 'Positive'
                ? styles.positive
                : article.sentiment === 'Negative'
                  ? styles.negative
                  : styles.neutral,
            ]}
          >
            {t(SENTIMENT_KEYS[article.sentiment] ?? article.sentiment)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function NewsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextPageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const loadInitial = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    nextPageRef.current = 1;
    try {
      const data = await fetchNews({ page: 1, items: PAGE_SIZE });
      setArticles(data);
      setHasMore(data.length === PAGE_SIZE);
      nextPageRef.current = 2;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('news.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchNews({ page: nextPageRef.current, items: PAGE_SIZE });
      setArticles((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      nextPageRef.current += 1;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('news.failedToLoadMore'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loading, t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && articles.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadInitial()}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.news_url}
      renderItem={({ item }) => <NewsCard article={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInitial(true)} />}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator />
          </View>
        ) : null
      }
      contentContainerStyle={articles.length === 0 ? styles.center : undefined}
      style={styles.list}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: { backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
    errorText: { color: colors.danger, textAlign: 'center', marginBottom: 16 },
    retryButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
    retryButtonText: { color: colors.onAccent, fontWeight: '600' },
    card: { flexDirection: 'row', padding: 16, backgroundColor: colors.background },
    image: { width: 84, height: 84, borderRadius: 8, backgroundColor: colors.surface },
    cardBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    title: { fontSize: 15, fontWeight: '600', lineHeight: 20, color: colors.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    source: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    metaDot: { fontSize: 12, color: colors.textFaint, marginHorizontal: 6 },
    date: { fontSize: 12, color: colors.textMuted },
    sentiment: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
    positive: { color: colors.success },
    negative: { color: colors.danger },
    neutral: { color: colors.textMuted },
    separator: { height: 1, backgroundColor: colors.border },
    footer: { paddingVertical: 20 },
  });
}
