# CryptoMarketViewer

A mobile app for browsing live cryptocurrency prices, viewing coin details, saving favorites, and reading crypto news. Built with Expo and React Native as a final project for CM3050 Mobile Development.

## Features

- **Email/password authentication** — sign up, log in, log out, with sessions persisted securely on-device
- **Market list** — top cryptocurrencies by market cap, with each coin's live logo, paginated 10 at a time with infinite scroll and pull-to-refresh
- **Search** — find any of the top 5000 active coins by name or symbol, with search history you can tap to re-run (only saved when you actually pick a result, not on every keystroke)
- **Coin detail page** — price, 24h/7d/30d/60d/90d change, market cap, volume, supply figures, description, tags, official links (website, explorer, source code, whitepaper, socials), and a **price history chart** (1D/7D/30D/90D/1Y) drawn with `react-native-svg`
- **Multiple named favorites lists** — star any coin from the list or detail page to add it to one or more personal lists (e.g. "Long-term holds", "Watching"); create, rename, and delete lists from the Favorites tab, which shows your lists as a row of switchable chips at the top. Synced per-account via Supabase, capped at 100 coins per list.
- **Portfolio tracking** — record how much of each coin you hold, see live total value (quantity × current price, refreshable on demand or by pull-to-refresh), edit or remove a holding by tapping it
- **News feed** — latest general crypto news with infinite scroll and pull-to-refresh; tapping a story opens it in the browser
- **English / 中文 / 日本語** — a language picker (in Settings, and on the login screen so it's usable before you're even signed in) switches every screen's UI text, number/date formatting, and — automatically — the display currency (English→USD, Chinese→CNY, Japanese→JPY). Coin descriptions and news articles stay in English regardless, since those come from English-only third-party APIs that can't be localized on our end.
- **Light / Dark / System appearance** — a picker in Settings switches the whole app's color scheme, persisted on-device; "System" (the default) follows the OS setting live via `useColorScheme`.

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
| Local storage | `@react-native-async-storage/async-storage` (search history, language preference) |
| Charts | `react-native-svg` (hand-rolled line chart, no charting library) |
| Localization | `i18next` + `react-i18next` + `expo-localization` (device-locale detection) |

Supabase is called directly from the app with its public anon key (safe by design — protected by Row Level Security). CoinMarketCap and CryptoNews API are called through a Supabase Edge Function (`supabase/functions/api-proxy`) that injects their keys server-side, so those keys are never bundled into the app — see [API notes & limitations](#api-notes--limitations) and [Deploying the api-proxy Edge Function](#deploying-the-api-proxy-edge-function) below.

## Project structure

```
app/                      expo-router routes (screens)
  _layout.tsx             root layout — auth gate (logged out -> (auth), logged in -> (tabs))
  (auth)/                 login & signup screens
  (tabs)/                 Market, Search, Favorites, News, Portfolio tabs (bottom tab bar + header)
  coin/[id].tsx           coin detail screen (incl. price history chart)
  portfolio/add.tsx       modal: search-and-pick a coin, then enter a quantity to add to your portfolio
  settings.tsx            account settings / logout modal

components/               shared UI components:
                            CoinRow          — market/favorites/search list row (logo, price, change, star)
                            FavoriteButton   — the star; opens AddToListSheet
                            AddToListSheet   — bottom sheet to add/remove a coin from lists
                            TextPromptModal  — cross-platform text input modal (create/rename a list)
                            PriceChart       — SVG line chart for a coin's historical price
                            LanguagePicker   — English/中文/日本語 selector (Settings + login screen)
                            ThemePicker      — Light/Dark/System selector (Settings)
contexts/                 React context providers (AuthContext, FavoriteListsContext, LanguageContext, ThemeContext)
lib/                      API clients & helpers (supabase, coinmarketcap, news, favoriteLists, portfolio, searchHistory, format, i18n, theme)
locales/                  Translation strings: en.json, zh.json, ja.json
supabase/                 SQL migrations to run in the Supabase SQL editor
  functions/api-proxy/    Edge Function proxying CoinMarketCap & CryptoNews (keeps their keys off the device)
```

## Prerequisites

- [Node.js](https://nodejs.org) LTS
- npm
- The [Expo Go](https://expo.dev/go) app on your phone, **or** an iOS Simulator / Android Emulator set up locally
- The [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`), for deploying the `api-proxy` Edge Function
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
   ```

   - Supabase URL/anon key: Supabase dashboard → Project Settings → API

   `.env` is gitignored — never commit real keys.

   The CoinMarketCap and CryptoNews API keys do **not** go in `.env` — they're only used server-side by the `api-proxy` Edge Function. See [Deploying the api-proxy Edge Function](#deploying-the-api-proxy-edge-function) below.

3. **Set up the Supabase database**

   Run all four SQL files once, **in order**, in your Supabase project's **SQL Editor** (Dashboard → SQL Editor → New query):

   1. `supabase/favorites.sql` — creates the original flat `favorites` table and RLS policies
   2. `supabase/favorites_limit.sql` — adds a trigger capping each user at 100 favorites
   3. `supabase/favorite_lists.sql` — creates `favorite_lists` + `favorite_list_coins` (multiple named lists), migrates any rows from the old `favorites` table into a new "My Favorites" list per user, then **drops the `favorites` table**
   4. `supabase/portfolio.sql` — creates `portfolio_holdings` (coin + quantity per user) with RLS policies

   Steps 1–2 exist only so step 3 has something to migrate from — on a brand-new Supabase project with no existing data, you technically only need steps 3 and 4, but running all four in order is simplest and matches how this schema actually evolved. You can confirm the final state by checking **Table Editor** for `favorite_lists`, `favorite_list_coins`, and `portfolio_holdings` (no `favorites` table should remain).

4. **Deploy the `api-proxy` Edge Function**

   See [Deploying the api-proxy Edge Function](#deploying-the-api-proxy-edge-function) below.

5. **Run the app**

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

   > **Note:** web is not a supported target — `react-native-web` isn't installed, so `npm run web` won't start. This app targets iOS/Android only.

## Deploying the `api-proxy` Edge Function

CoinMarketCap and CryptoNews are called through a Supabase Edge Function (`supabase/functions/api-proxy`) instead of directly from the app, so their API keys never end up in the shipped bundle (unlike `EXPO_PUBLIC_*` vars, which do — see [API notes & limitations](#api-notes--limitations)). The function takes requests at `.../api-proxy/cmc/<path>` or `.../api-proxy/news/<path>`, attaches the right key server-side, and forwards them upstream.

One-time setup, from the project root:

```bash
# 1. Install the CLI if you don't have it
brew install supabase/tap/supabase

# 2. Log in (opens a browser)
supabase login

# 3. Link this repo to your Supabase project (creates supabase/config.toml)
supabase init          # only needed once, if supabase/config.toml doesn't exist yet
supabase link --project-ref <your-project-ref>   # ref is in the Supabase dashboard URL

# 4. Store the real API keys as server-side secrets (never committed, never in .env)
supabase secrets set \
  CMC_API_BASE_URL=https://pro-api.coinmarketcap.com \
  CMC_API_KEY=<your-coinmarketcap-key> \
  NEWS_API_BASE_URL=https://cryptonews-api.com/api/v1 \
  NEWS_API_KEY=<your-cryptonews-key>

# 5. Deploy
supabase functions deploy api-proxy
```

Re-run only step 5 (`supabase functions deploy api-proxy`) after editing `supabase/functions/api-proxy/index.ts`; re-run step 4 if a key rotates.

To sanity-check the deployment directly (bypassing the app):

```bash
curl -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/api-proxy/cmc/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank&limit=2"
```

A 200 with coin data back means the function has the CMC secret wired up correctly. The `Authorization` header is required because Edge Functions verify a Supabase JWT by default — the public anon key satisfies that, same as any other Supabase client call.

## API notes & limitations

- **CoinMarketCap and CryptoNews keys are server-side only**, via the `api-proxy` Edge Function (see above) — they're set with `supabase secrets set`, never checked into `.env` or bundled into the app. Supabase itself is still called directly from the device with its public anon key, which is safe by design: Supabase expects the anon key to be public and relies on Row Level Security (not key secrecy) to protect data.
- **CoinMarketCap `quotes/latest` caps the `id` list at 400** comma-separated coin IDs per request (confirmed from the API's own error message). Each favorites list is capped at 100 coins specifically to stay well under this limit — enforced both client-side (instant feedback) and via a Postgres trigger (`favorite_list_coins_limit_trigger` in `favorite_lists.sql`), so the cap holds even if something bypasses the app.
- **Coin logos are free** — CoinMarketCap serves them from a static, unauthenticated CDN keyed only by coin ID (`https://s2.coinmarketcap.com/static/img/coins/64x64/{id}.png`), so the Market/Favorites rows show real logos without any extra API call or credit cost.
- **CryptoNews API trial keys cap `items` at 3 per request.** The News tab pages in chunks of 3 as a result; a paid plan allows up to 100 and only requires bumping `PAGE_SIZE` in `app/(tabs)/news.tsx`.
- **CoinMarketCap API version inconsistencies:** `/v3/.../listings/latest` and `/v3/.../quotes/latest` return `quote` as an *array* of per-currency objects, while `/v2/cryptocurrency/info` returns fields keyed by coin ID and uses plain string `tags` (vs. `{slug, name, category}` objects in v3). The typed clients in `lib/coinmarketcap.ts` account for this.
- **`/v1/cryptocurrency/map` (used for Search and the portfolio coin picker) costs 0 API credits** and caps at 5000 results per request (confirmed live — `limit=10000` errors with `"limit" must be less than or equal to 5000`). Fetched once and cached in memory for the session rather than re-fetched per keystroke.
- **`/v2/cryptocurrency/ohlcv/historical` returns a 403** on this key's plan ("subscription plan doesn't support this endpoint"), so the price chart uses `/v2/cryptocurrency/quotes/historical` instead — it doesn't give OHLC candles, but a line chart only needs the price points anyway.
- **The portfolio's "real-time" value is refresh-on-demand, not streaming.** CoinMarketCap's free/Basic tier has no WebSocket price feed (that's an Enterprise-tier feature), so "live" here means fresh prices on load, pull-to-refresh, or tapping the refresh button — same freshness model as every other screen in the app.
- **`convert=` (for currency conversion) is capped at 1 currency per request** on this plan — confirmed live: `convert=USD,EUR,JPY` in one call is rejected with `"Your plan is limited to 1 convert options"`. It works fine for any single currency (tested EUR/GBP/JPY/CNY) across every endpoint the app uses (listings, single/batch quotes, historical). Because multiple currencies can't be fetched at once, switching the app's currency means every screen showing live prices refetches from the API rather than just reformatting already-fetched data client-side.

## Tech decisions worth knowing

- **expo-router** was chosen over manually wiring React Navigation for file-based routing, built-in auth redirects (`Stack.Protected`), and because it's Expo's current recommended default.
- **Supabase** was chosen for auth over Firebase for its Postgres backend + Row Level Security, which the favorites feature relies on directly (no custom backend needed).
- **Favorites started as a single flat list**, then evolved into multiple named lists (a many-to-many `favorite_lists` ↔ `favorite_list_coins` model). Because a coin can now belong to several lists at once, the old single-tap star toggle became an "add to list(s)" bottom sheet (`AddToListSheet`) instead — a plain on/off toggle no longer has a coherent meaning once membership isn't binary.
- **`Alert.prompt` was avoided for naming/renaming lists** — it's iOS-only and has no Android equivalent, so list creation/renaming uses a custom cross-platform `TextPromptModal` instead.
- **The price chart is hand-rolled with `react-native-svg`, not a charting library.** `react-native-gifted-charts` (the obvious alternative) pulls in a native `linear-gradient` peer-dependency chain that's a messier fit for this project — for a single line chart, a plain `<Path>` is simpler and more reliable than debugging someone else's chart library.
- **`CoinRow` gained an optional `onPress` prop** forwarded to `expo-router`'s `Link` (which runs it as a side effect alongside navigation, not instead of it) — used by the Search tab to record a search-history entry only when a result is actually tapped, not on every keystroke.
- **The portfolio's coin picker doesn't reuse `CoinRow`.** `CoinRow` always navigates to the coin detail page on tap; while picking a coin to add to your portfolio you want to *select* it in place, not navigate away. `app/portfolio/add.tsx` has its own small non-navigating `PickableCoinRow` instead of overloading `CoinRow` with a "disable navigation" flag it doesn't otherwise need.
- **Installing a new native dependency (e.g. `react-native-svg`) requires a full Metro/dev-server restart, not just Fast Refresh** — Expo Go negotiates its native module set at connection time, so a hot-reloaded JS bundle can silently fail to render a component that needs a newly-added native module until the dev server restarts.
- **Currency follows language automatically rather than being a separate picker.** Language and currency are both rare, related decisions — a Chinese reader overwhelmingly wants CNY — so a second independent setting would mostly go untouched. `LanguageContext` derives `currency` from `language` via a fixed map (en→USD, zh→CNY, ja→JPY); no separate persisted preference or UI needed.
- **`lib/format.ts` uses module-level `currentLocale`/`currentCurrency` variables** (set via `setFormatLocale`/`setFormatCurrency` from `LanguageContext`) rather than threading a locale/currency argument through every formatter call site. Plain functions can't use React context directly, and passing them explicitly everywhere would have meant touching dozens of call sites for no real benefit.
- **`getUsdQuote` was renamed to `getQuote(coin, currency)` instead of getting an overload.** The hard rename was deliberate: removing the old name entirely meant TypeScript would refuse to compile until every call site was updated — which caught one real miss (the portfolio total-value calculation) during the currency rollout.
- **Theming uses a `useTheme()` color-token hook, not React Native's `Appearance` API called ad hoc per screen.** `ThemeContext` resolves a `system`/`light`/`dark` preference (persisted, defaulting to `system` via `useColorScheme`) into a flat `colors` object from `lib/theme.ts`; every screen turns its `StyleSheet.create({...})` into a `createStyles(colors)` function called with `useMemo`. This keeps color values in one place instead of duplicating light/dark branches in 17 separate stylesheets. `app.json`'s `userInterfaceStyle` had to change from `"light"` (which hard-locks the app away from the OS dark setting) to `"automatic"` for system-following to work at all.

## Possible future work

Done: Search, price history chart, portfolio tracking, multi-language + currency support, and Light/Dark/System appearance (see Features above). Remaining ideas:

1. **Biometric login (Face ID/Touch ID)** — quick to bolt onto the existing Supabase auth session via `expo-local-authentication`, and it's a genuine "native mobile capability" showcase, which matters if this is being graded partly on mobile-specific competency rather than just CRUD screens.
2. **Portfolio value-over-time chart** — currently only *current* portfolio value is shown, not its history. This is deliberately out of scope for now: doing it accurately needs either (a) a full buy/sell transaction ledger (not just current quantity) so historical holdings can be reconstructed, or (b) a scheduled job snapshotting daily portfolio value server-side (this project has no cron infrastructure yet). A quick-but-approximate version — reusing `fetchCoinHistory` + `PriceChart` per holding, assuming current quantities were held for the whole period — is possible without new infrastructure, but would need to be clearly labeled as approximate since it can't reflect quantity changes over time.
3. **A manual currency override** — right now currency is strictly derived from language (see Tech decisions), so an English-reading user who wants JPY instead of USD has no way to get it. Decoupling them into an independent picker is straightforward given the plumbing already exists (`convert` threaded through every fetch function) — it would just need its own persisted preference and UI.

Smaller polish items worth a mention but lower priority: more languages beyond English/Chinese/Japanese (mechanically the same as adding the first two — a new `locales/xx.json` plus one more entry in each language-keyed map).