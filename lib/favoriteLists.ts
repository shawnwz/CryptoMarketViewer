import type { CmcCoin } from './coinmarketcap';
import { supabase } from './supabase';

// Keeps a single list comfortably under CoinMarketCap's 400-id cap on
// /v3/cryptocurrency/quotes/latest (see lib/coinmarketcap.ts).
export const LIST_COIN_LIMIT = 100;

export type FavoriteList = {
  id: string;
  name: string;
  created_at: string;
};

export type FavoriteListCoin = {
  list_id: string;
  coin_id: number;
  symbol: string;
  name: string;
  added_at: string;
};

export async function listFavoriteLists(): Promise<FavoriteList[]> {
  const { data, error } = await supabase
    .from('favorite_lists')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// One query for every coin in every one of the user's lists — cheap since
// it's DB rows only (no CoinMarketCap calls), used to derive "which lists
// contain this coin" without a request per list.
export async function listAllFavoriteListCoins(): Promise<FavoriteListCoin[]> {
  const { data, error } = await supabase
    .from('favorite_list_coins')
    .select('list_id, coin_id, symbol, name, added_at');

  if (error) throw new Error(error.message);
  return data;
}

export async function createFavoriteList(name: string): Promise<FavoriteList> {
  const { data, error } = await supabase
    .from('favorite_lists')
    .insert({ name })
    .select('id, name, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function renameFavoriteList(listId: string, name: string): Promise<void> {
  const { error } = await supabase.from('favorite_lists').update({ name }).eq('id', listId);
  if (error) throw new Error(error.message);
}

export async function deleteFavoriteList(listId: string): Promise<void> {
  const { error } = await supabase.from('favorite_lists').delete().eq('id', listId);
  if (error) throw new Error(error.message);
}

export async function addCoinToList(
  listId: string,
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>
): Promise<void> {
  const { error } = await supabase.from('favorite_list_coins').insert({
    list_id: listId,
    coin_id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
  });

  if (error) throw new Error(error.message);
}

export async function removeCoinFromList(listId: string, coinId: number): Promise<void> {
  const { error } = await supabase
    .from('favorite_list_coins')
    .delete()
    .eq('list_id', listId)
    .eq('coin_id', coinId);

  if (error) throw new Error(error.message);
}
