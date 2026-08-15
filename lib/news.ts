import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// Requests go through the api-proxy Edge Function so the CryptoNews key
// stays server-side instead of being bundled into the shipped app.
const API_BASE_URL = `${SUPABASE_URL}/functions/v1/api-proxy/news`;

export type NewsArticle = {
  news_url: string;
  image_url: string;
  title: string;
  text: string;
  source_name: string;
  date: string;
  topics: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  type: string;
};

type NewsSuccessResponse = { data: NewsArticle[] };
type NewsErrorResponse = { message: string };

// The trial API key is capped at 3 items per request (confirmed live — anything
// higher returns a 403 telling you to upgrade); paid plans allow up to 100.
export async function fetchNews({ page, items }: { page: number; items: number }): Promise<NewsArticle[]> {
  const url = `${API_BASE_URL}/category?section=general&items=${items}&page=${page}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const body = (await response.json()) as NewsSuccessResponse | NewsErrorResponse;

  if (!response.ok || !('data' in body)) {
    throw new Error('message' in body ? body.message : `News request failed (${response.status})`);
  }

  return body.data;
}
