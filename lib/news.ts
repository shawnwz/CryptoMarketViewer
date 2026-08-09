const API_BASE_URL = process.env.EXPO_PUBLIC_NEWS_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;

if (!API_BASE_URL || !API_KEY) {
  throw new Error(
    'Missing crypto news env vars. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_NEWS_API_BASE_URL and EXPO_PUBLIC_NEWS_API_KEY, then restart the dev server.'
  );
}

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
  const url = `${API_BASE_URL}/category?section=general&items=${items}&page=${page}&token=${API_KEY}`;
  const response = await fetch(url);
  const body = (await response.json()) as NewsSuccessResponse | NewsErrorResponse;

  if (!response.ok || !('data' in body)) {
    throw new Error('message' in body ? body.message : `News request failed (${response.status})`);
  }

  return body.data;
}
