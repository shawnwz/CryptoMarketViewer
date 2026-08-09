# CryptoMarketViewer

A mobile app for browsing live cryptocurrency prices, viewing coin details, saving favorites, and reading crypto news. Built with Expo and React Native as a final project for CM3050 Mobile Development.

## Features

- **Email/password authentication** — sign up, log in, log out, with sessions persisted securely on-device
- **Market list** — top cryptocurrencies by market cap, paginated 10 at a time with infinite scroll
- **Coin detail page** — price, 24h/7d/30d/60d/90d change, market cap, volume, supply figures, description, tags, and official links (website, explorer, source code, whitepaper, socials)
- **Favorites** — star any coin from the list or detail page to save it to your personal favorites list (synced per-account via Supabase, capped at 100 coins)
- **News feed** — latest general crypto news with infinite scroll; tapping a story opens it in the browser

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 57) + React Native |
| Language | TypeScript |
| Navigation | [expo-router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| Auth & database | [Supabase](https://supabase.com) (Postgres + Auth, with Row Level Security) |
| Market data | [CoinMarketCap Pro API](https://coinmarketcap.com/api/) |
| News data | [CryptoNews API](https://cryptonews-api.com) |
| Secure storage | `expo-secure-store` (auth session persistence) |

All three external services (Supabase, CoinMarketCap, CryptoNews API) are called directly from the app using client-side API keys — see [API notes & limitations](#api-notes--limitations) below for the tradeoffs this implies.

## Project structure

```
app/                      expo-router routes (screens)
  _layout.tsx             root layout — auth gate (logged out -> (auth), logged in -> (tabs))
  (auth)/                 login & signup screens
  (tabs)/                 Market, Favorites, News tabs (bottom tab bar + header)
  coin/[id].tsx           coin detail screen
  settings.tsx            account settings / logout modal

components/               shared UI components (CoinRow, FavoriteButton)
contexts/                 React context providers (AuthContext, FavoritesContext)
lib/                      API clients & helpers (supabase, coinmarketcap, news, favorites, format)
supabase/                 SQL migrations to run in the Supabase SQL editor
```

## Prerequisites

- [Node.js](https://nodejs.org) LTS
- npm
- The [Expo Go](https://expo.dev/go) app on your phone, **or** an iOS Simulator / Android Emulator set up locally
- Accounts + API keys for:
  - [Supabase](https://supabase.com) (free tier)
  - [CoinMarketCap](https://pro.coinmarketcap.com/signup) (free/Basic tier is enough for market data + coin details)
  - [CryptoNews API](https://cryptonews-api.com) (free trial key works, with limits — see below)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and fill in your own keys:

   ```bash
   cp .env.example .env
   ```

   `.env` needs:

   ```
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=

   EXPO_PUBLIC_CMC_API_BASE_URL=https://pro-api.coinmarketcap.com
   EXPO_PUBLIC_CMC_API_KEY=

   EXPO_PUBLIC_NEWS_API_BASE_URL=https://cryptonews-api.com/api/v1
   EXPO_PUBLIC_NEWS_API_KEY=
   ```

   - Supabase URL/anon key: Supabase dashboard → Project Settings → API
   - CoinMarketCap key: pro.coinmarketcap.com → API Keys
   - CryptoNews API key: cryptonews-api.com → your account dashboard

   `.env` is gitignored — never commit real keys.

3. **Set up the Supabase database**

   The app needs one table (`favorites`) with Row Level Security. Run both SQL files once in your Supabase project's **SQL Editor** (Dashboard → SQL Editor → New query), in order:

   1. `supabase/favorites.sql` — creates the `favorites` table and RLS policies scoping every row to its owner
   2. `supabase/favorites_limit.sql` — adds a trigger capping each user at 100 favorites

   You can confirm they applied by checking **Table Editor** for a `favorites` table.

4. **Run the app**

   ```bash
   npm start
   ```

   Then either:
   - Scan the QR code with Expo Go (iOS/Android), or
   - Press `i` for the iOS Simulator, or `a` for the Android Emulator

   Direct shortcuts are also available:

   ```bash
   npm run ios
   npm run android
   ```

   > **Note:** `npm run web` will start, but the CoinMarketCap and CryptoNews API calls will fail in a browser due to CORS — both APIs are meant for server-side or native-app use, not direct browser calls. This app targets iOS/Android; web is not a supported target for the live-data screens.

## API notes & limitations

- **API keys ship in the client.** All three services are called directly from the device using `EXPO_PUBLIC_*` env vars, which get bundled into the app and are visible to anyone inspecting network traffic or the compiled app. This is acceptable for a course project but is **not** a pattern to carry into production — the correct fix is proxying these calls through a backend (e.g. a Supabase Edge Function) so keys never leave the server.
- **CoinMarketCap `quotes/latest` caps the `id` list at 400** comma-separated coin IDs per request (confirmed from the API's own error message). The favorites feature is capped at 100 coins specifically to stay well under this limit.
- **CryptoNews API trial keys cap `items` at 3 per request.** The News tab pages in chunks of 3 as a result; a paid plan allows up to 100 and only requires bumping `PAGE_SIZE` in `app/(tabs)/news.tsx`.
- **CoinMarketCap API version inconsistencies:** `/v3/.../listings/latest` and `/v3/.../quotes/latest` return `quote` as an *array* of per-currency objects, while `/v2/cryptocurrency/info` returns fields keyed by coin ID and uses plain string `tags` (vs. `{slug, name, category}` objects in v3). The typed clients in `lib/coinmarketcap.ts` account for this.

## Tech decisions worth knowing

- **expo-router** was chosen over manually wiring React Navigation for file-based routing, built-in auth redirects (`Stack.Protected`), and because it's Expo's current recommended default.
- **Supabase** was chosen for auth over Firebase for its Postgres backend + Row Level Security, which the favorites feature relies on directly (no custom backend needed).
- **Flat favorites list** (not folders/collections) was built first as the simpler version of the feature; the data model and screens were structured so multiple named lists could be added later without a rewrite.
