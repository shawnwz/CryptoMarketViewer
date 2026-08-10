import type { CmcCoin } from './coinmarketcap';
import { supabase } from './supabase';

export type Holding = {
  coin_id: number;
  symbol: string;
  name: string;
  quantity: number;
  created_at: string;
};

export async function listHoldings(): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .select('coin_id, symbol, name, quantity, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

// Adding a coin that's already held updates its quantity rather than duplicating the row.
export async function upsertHolding(
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from('portfolio_holdings')
    .upsert(
      { coin_id: coin.id, symbol: coin.symbol, name: coin.name, quantity },
      { onConflict: 'user_id,coin_id' }
    );

  if (error) throw new Error(error.message);
}

export async function deleteHolding(coinId: number): Promise<void> {
  const { error } = await supabase.from('portfolio_holdings').delete().eq('coin_id', coinId);
  if (error) throw new Error(error.message);
}
