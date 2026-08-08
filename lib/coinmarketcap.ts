const API_BASE_URL = process.env.EXPO_PUBLIC_CMC_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_CMC_API_KEY;

if (!API_BASE_URL || !API_KEY) {
  throw new Error(
    'Missing CoinMarketCap env vars. Copy .env.example to .env and fill in ' +
      'EXPO_PUBLIC_CMC_API_BASE_URL and EXPO_PUBLIC_CMC_API_KEY, then restart the dev server.'
  );
}

export type CmcQuote = {
  symbol: string;
  price: number;
  volume_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap: number;
  last_updated: string;
};

export type CmcCoin = {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  circulating_supply: number;
  quote: CmcQuote[];
};

type CmcListingsResponse = {
  status: { error_code: string; error_message: string };
  data: CmcCoin[];
};

export function getUsdQuote(coin: CmcCoin): CmcQuote | undefined {
  return coin.quote.find((quote) => quote.symbol === 'USD');
}

export async function fetchCoinListings({
  start,
  limit,
}: {
  start: number;
  limit: number;
}): Promise<CmcCoin[]> {
  const url = `${API_BASE_URL}/v3/cryptocurrency/listings/latest?start=${start}&limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      'X-CMC_PRO_API_KEY': API_KEY,
      Accept: 'application/json',
    },
  });

  const body = (await response.json()) as CmcListingsResponse;

  if (!response.ok || body.status.error_code !== '0') {
    throw new Error(body.status.error_message || `CoinMarketCap request failed (${response.status})`);
  }

  return body.data;
}
