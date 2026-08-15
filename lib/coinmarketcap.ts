import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

// Requests go through the api-proxy Edge Function so the CoinMarketCap key
// stays server-side instead of being bundled into the shipped app.
const API_BASE_URL = `${SUPABASE_URL}/functions/v1/api-proxy/cmc`;

function cmcFetch<T>(path: string): Promise<T> {
  return fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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

// Every fetch function below requests exactly one currency (this plan caps
// `convert` at 1 option per request — confirmed live), so a coin's `quote`
// array always contains exactly one entry: the currency that was requested.
export function getQuote(coin: CmcCoin, currency: string): CmcQuote | undefined {
  return coin.quote.find((quote) => quote.symbol === currency);
}

// CMC serves coin logos from a static CDN keyed only by id — no API call or
// key needed (confirmed live: works unauthenticated, 403s for unknown ids).
export function getCoinLogoUrl(coinId: number): string {
  return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coinId}.png`;
}

export async function fetchCoinListings({
  start,
  limit,
  convert,
}: {
  start: number;
  limit: number;
  convert: string;
}): Promise<CmcCoin[]> {
  const body = await cmcFetch<{ data: CmcCoin[] }>(
    `/v3/cryptocurrency/listings/latest?start=${start}&limit=${limit}&convert=${convert}`
  );
  return body.data;
}

export async function fetchCoinQuote(id: number, convert: string): Promise<CmcCoin> {
  const body = await cmcFetch<{ data: CmcCoin[] }>(
    `/v3/cryptocurrency/quotes/latest?id=${id}&convert=${convert}`
  );
  return body.data[0];
}

// Response order doesn't match the requested id order, so callers that care
// about ordering (e.g. a favorites list) should re-sort by id themselves.
// The API caps the `id` param at 400 comma-separated values (confirmed via a live 400/401 test);
// callers passing more than that will need to chunk the requests.
export async function fetchCoinQuotes(ids: number[], convert: string): Promise<CmcCoin[]> {
  if (ids.length === 0) return [];
  const body = await cmcFetch<{ data: CmcCoin[] }>(
    `/v3/cryptocurrency/quotes/latest?id=${ids.join(',')}&convert=${convert}`
  );
  return body.data;
}

export async function fetchCoinInfo(id: number): Promise<CmcCoinInfo> {
  const body = await cmcFetch<{ data: Record<string, CmcCoinInfo> }>(`/v2/cryptocurrency/info?id=${id}`);
  return body.data[String(id)];
}

export type CmcCoinMapEntry = {
  id: number;
  name: string;
  symbol: string;
  rank: number | null;
};

let coinMapPromise: Promise<CmcCoinMapEntry[]> | null = null;

// The full id/name/symbol map for every active coin, sorted by rank — used to
// search locally without hitting quotes/latest for every keystroke. This
// endpoint costs 0 API credits (confirmed live) and caps at 5000 results
// (also confirmed live: limit=10000 errors with "must be less than or equal
// to 5000"), which covers every coin anyone would realistically search for.
// Cached in memory for the app session since the list rarely changes (and
// carries no price data, so it's unaffected by currency).
export function fetchCoinMap(): Promise<CmcCoinMapEntry[]> {
  if (!coinMapPromise) {
    coinMapPromise = cmcFetch<{ data: CmcCoinMapEntry[] }>(
      '/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank&limit=5000'
    )
      .then((body) => body.data)
      .catch((e) => {
        coinMapPromise = null;
        throw e;
      });
  }
  return coinMapPromise;
}

export type CmcHistoricalPoint = {
  timestamp: string;
  price: number;
};

// Note: /v2/cryptocurrency/ohlcv/historical returns 403 ("subscription plan
// doesn't support this endpoint") on this key's plan — confirmed live.
// quotes/historical works fine and is all a line chart needs anyway.
export async function fetchCoinHistory({
  id,
  interval,
  count,
  convert,
}: {
  id: number;
  interval: 'hourly' | 'daily';
  count: number;
  convert: string;
}): Promise<CmcHistoricalPoint[]> {
  const body = await cmcFetch<{
    data: { quotes: { timestamp: string; quote: Record<string, { price: number }> }[] };
  }>(`/v2/cryptocurrency/quotes/historical?id=${id}&count=${count}&interval=${interval}&convert=${convert}`);

  return body.data.quotes.map((q) => ({ timestamp: q.timestamp, price: q.quote[convert].price }));
}
