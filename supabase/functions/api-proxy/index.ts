// Proxies CoinMarketCap and CryptoNews requests so the API keys stay server-side
// instead of being bundled into the shipped app.
//
// Client calls:
//   {SUPABASE_URL}/functions/v1/api-proxy/cmc/<cmc-path>
//   {SUPABASE_URL}/functions/v1/api-proxy/news/<news-path>
//
// Requires secrets set via `supabase secrets set`:
//   CMC_API_BASE_URL, CMC_API_KEY, NEWS_API_BASE_URL, NEWS_API_KEY

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  // Path looks like /api-proxy/cmc/v3/cryptocurrency/listings/latest
  const segments = url.pathname.replace(/^\/+/, '').split('/');
  const [, provider, ...rest] = segments; // segments[0] === "api-proxy"

  let upstreamBase: string | undefined;
  let headers: HeadersInit = {};
  let search = url.search;

  if (provider === 'cmc') {
    upstreamBase = Deno.env.get('CMC_API_BASE_URL');
    headers = {
      'X-CMC_PRO_API_KEY': Deno.env.get('CMC_API_KEY') ?? '',
      Accept: 'application/json',
    };
  } else if (provider === 'news') {
    upstreamBase = Deno.env.get('NEWS_API_BASE_URL');
    const params = new URLSearchParams(url.search);
    params.set('token', Deno.env.get('NEWS_API_KEY') ?? '');
    search = `?${params.toString()}`;
  } else {
    return new Response(JSON.stringify({ error: `Unknown provider "${provider}"` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!upstreamBase) {
    return new Response(JSON.stringify({ error: `Missing base URL secret for provider "${provider}"` }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const upstreamUrl = `${upstreamBase}/${rest.join('/')}${search}`;
  const upstreamResponse = await fetch(upstreamUrl, { headers });
  const body = await upstreamResponse.text();

  return new Response(body, {
    status: upstreamResponse.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json',
    },
  });
});
