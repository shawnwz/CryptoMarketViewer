import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatShortDate } from '../../lib/format';
import { fetchNews, NewsArticle } from '../../lib/news';

// The API key's trial plan caps `items` at 3 per request (confirmed live —
// anything higher returns a 403), so we page in chunks of 3 instead of 10.
const PAGE_SIZE = 3;

function NewsCard({ article }: { article: NewsArticle }) {
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
            {article.sentiment}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nextPageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    nextPageRef.current = 1;
    try {
      const data = await fetchNews({ page: 1, items: PAGE_SIZE });
      setArticles(data);
      setHasMore(data.length === PAGE_SIZE);
      nextPageRef.current = 2;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError(e instanceof Error ? e.message : 'Failed to load more news');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loading]);

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
        <Pressable style={styles.retryButton} onPress={loadInitial}>
          <Text style={styles.retryButtonText}>Retry</Text>
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
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator />
          </View>
        ) : null
      }
      contentContainerStyle={articles.length === 0 ? styles.center : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  errorText: { color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  card: { flexDirection: 'row', padding: 16, backgroundColor: '#fff' },
  image: { width: 84, height: 84, borderRadius: 8, backgroundColor: '#eee' },
  cardBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  source: { fontSize: 12, color: '#666', fontWeight: '500' },
  metaDot: { fontSize: 12, color: '#ccc', marginHorizontal: 6 },
  date: { fontSize: 12, color: '#888' },
  sentiment: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
  neutral: { color: '#888' },
  separator: { height: 1, backgroundColor: '#eee' },
  footer: { paddingVertical: 20 },
});
