const API_BASE_URL = process.env.EXPO_PUBLIC_CMC_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_CMC_API_KEY;

if (!API_BASE_URL || !API_KEY) {
  throw new Error(
    'Missing CoinMarketCap env vars. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_CMC_API_BASE_URL and EXPO_PUBLIC_CMC_API_KEY, then restart the dev server.'
  );
}

function cmcFetch<T>(path: string): Promise<T> {
  return fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'X-CMC_PRO_API_KEY': API_KEY as string,
      Accept: 'application/json',
    },
  }).then(async (response) => {
    const body = (await response.json()) as {
      status: { error_code: string | number; error_message: string | null };
    } & T;
    // v3 endpoints send error_code as the string "0"; v1/v2 endpoints send the number 0.
    if (!response.ok || Number(body.status.error_code) !== 0) {
      throw new Error(body.status.error_message || `CoinMarketCap request failed (${response.status})`);
    }
    return body;
  });
}

export type CmcQuote = {
  symbol: string;
  price: number;
  volume_24h: number;
  volume_change_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
  percent_change_60d: number;
  percent_change_90d: number;
  market_cap: number;
  market_cap_dominance: number;
  fully_diluted_market_cap: number;
  last_updated: string;
};

export type CmcCoin = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  quote: CmcQuote[];
};

export type CmcUrls = {
  website: string[];
  twitter: string[];
  message_board: string[];
  chat: string[];
  facebook: string[];
  explorer: string[];
  reddit: string[];
  technical_doc: string[];
  source_code: string[];
  announcement: string[];
};

export type CmcCoinInfo = {
  id: number;
  name: string;
  symbol: string;
  category: string;
  description: string;
  slug: string;
  logo: string;
  tags: string[];
  urls: CmcUrls;
  date_added: string;
  date_launched: string | null;
  twitter_username: string;
};

export function getUsdQuote(coin: CmcCoin): CmcQuote | undefined {
  return coin.quote.find((quote) => quote.symbol === 'USD');
}

// CMC serves coin logos from a static CDN keyed only by id — no API call or
// key needed (confirmed live: works unauthenticated, 403s for unknown ids).
export function getCoinLogoUrl(coinId: number): string {
  return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`;
}

export async function fetchCoinListings({
  start,
  limit,
}: {
  start: number;
  limit: number;
}): Promise<CmcCoin[]> {
  const body = await cmcFetch<{ data: CmcCoin[] }>(
    `/v3/cryptocurrency/listings/latest?start=${start}&limit=${limit}`
  );
  return body.data;
}

export async function fetchCoinQuote(id: number): Promise<CmcCoin> {
  const body = await cmcFetch<{ data: CmcCoin[] }>(`/v3/cryptocurrency/quotes/latest?id=${id}`);
  return body.data[0];
}

// Response order doesn't match the requested id order, so callers that care
// about ordering (e.g. a favorites list) should re-sort by id themselves.
// The API caps the `id` param at 400 comma-separated values (confirmed via a live 400/401 test);
// callers passing more than that will need to chunk the requests.
export async function fetchCoinQuotes(ids: number[]): Promise<CmcCoin[]> {
  if (ids.length === 0) return [];
  const body = await cmcFetch<{ data: CmcCoin[] }>(`/v3/cryptocurrency/quotes/latest?id=${ids.join(',')}`);
  return body.data;
}

export async function fetchCoinInfo(id: number): Promise<CmcCoinInfo> {
  const body = await cmcFetch<{ data: Record<string, CmcCoinInfo> }>(`/v2/cryptocurrency/info?id=${id}`);
  return body.data[String(id)];
}
