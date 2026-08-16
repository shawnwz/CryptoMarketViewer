import { CmcCoin, fetchCoinListings, getCoinLogoUrl, getQuote } from '../coinmarketcap';

function mockFetchOnce(response: { ok: boolean; status?: number; body: unknown }) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: async () => response.body,
  }) as unknown as typeof fetch;
}

const baseCoin: CmcCoin = {
  id: 1,
  name: 'Bitcoin',
  symbol: 'BTC',
  slug: 'bitcoin',
  cmc_rank: 1,
  circulating_supply: 19_000_000,
  total_supply: 21_000_000,
  max_supply: 21_000_000,
  quote: [
    {
      symbol: 'USD',
      price: 63000,
      volume_24h: 0,
      volume_change_24h: 0,
      percent_change_1h: 0,
      percent_change_24h: 0,
      percent_change_7d: 0,
      percent_change_30d: 0,
      percent_change_60d: 0,
      percent_change_90d: 0,
      market_cap: 0,
      market_cap_dominance: 0,
      fully_diluted_market_cap: 0,
      last_updated: '2024-01-01T00:00:00.000Z',
    },
    {
      symbol: 'EUR',
      price: 58000,
      volume_24h: 0,
      volume_change_24h: 0,
      percent_change_1h: 0,
      percent_change_24h: 0,
      percent_change_7d: 0,
      percent_change_30d: 0,
      percent_change_60d: 0,
      percent_change_90d: 0,
      market_cap: 0,
      market_cap_dominance: 0,
      fully_diluted_market_cap: 0,
      last_updated: '2024-01-01T00:00:00.000Z',
    },
  ],
};

describe('getQuote', () => {
  it('returns the quote matching the requested currency', () => {
    expect(getQuote(baseCoin, 'EUR')?.price).toBe(58000);
  });

  it('returns undefined when the coin has no quote for that currency', () => {
    expect(getQuote(baseCoin, 'GBP')).toBeUndefined();
  });
});

describe('getCoinLogoUrl', () => {
  it('builds the static CDN URL from the coin id, no API call needed', () => {
    expect(getCoinLogoUrl(1)).toBe('https://s2.coinmarketcap.com/static/img/coins/64x64/1.png');
  });
});

describe('fetchCoinListings (cmcFetch error handling)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves with the data array on a v3-style success response (error_code as string "0")', async () => {
    mockFetchOnce({ ok: true, body: { data: [baseCoin], status: { error_code: '0', error_message: null } } });

    const result = await fetchCoinListings({ start: 1, limit: 10, convert: 'USD' });
    expect(result).toEqual([baseCoin]);
  });

  it('rejects with the API-provided message when error_code is non-zero, even if the HTTP status is 200', async () => {
    mockFetchOnce({
      ok: true,
      body: { data: [], status: { error_code: 1010, error_message: 'Invalid API key' } },
    });

    await expect(fetchCoinListings({ start: 1, limit: 10, convert: 'USD' })).rejects.toThrow('Invalid API key');
  });

  it('rejects with a generic message when the HTTP response itself is not ok and carries no error_message', async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      body: { status: { error_code: 1002, error_message: null } },
    });

    await expect(fetchCoinListings({ start: 1, limit: 10, convert: 'USD' })).rejects.toThrow(
      'CoinMarketCap request failed (401)'
    );
  });

  it('sends the anon key as a Bearer token and hits the api-proxy path, never the CMC key directly', async () => {
    mockFetchOnce({ ok: true, body: { data: [], status: { error_code: '0', error_message: null } } });

    await fetchCoinListings({ start: 1, limit: 10, convert: 'USD' });

    const [url, options] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/functions/v1/api-proxy/cmc/v3/cryptocurrency/listings/latest');
    expect(options.headers.Authorization).toMatch(/^Bearer .+/);
    expect(options.headers['X-CMC_PRO_API_KEY']).toBeUndefined();
  });
});
