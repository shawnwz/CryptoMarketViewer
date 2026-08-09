import type { CmcCoin } from './coinmarketcap';
import { supabase } from './supabase';

// Keeps a single favorites list comfortably under CoinMarketCap's 400-id cap
// on /v3/cryptocurrency/quotes/latest (see lib/coinmarketcap.ts).
export const FAVORITES_LIMIT = 100;

export type FavoriteCoin = {
  coin_id: number;
  symbol: string;
  name: string;
  created_at: string;
};

export async function listFavorites(): Promise<FavoriteCoin[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('coin_id, symbol, name, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function addFavorite(coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>): Promise<void> {
  const { error } = await supabase.from('favorites').insert({
    coin_id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
  });

  if (error) throw new Error(error.message);
}

export async function removeFavorite(coinId: number): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('coin_id', coinId);
  if (error) throw new Error(error.message);
}
