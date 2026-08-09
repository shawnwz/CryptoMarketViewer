import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CmcCoin } from '../lib/coinmarketcap';
import { addFavorite, FAVORITES_LIMIT, FavoriteCoin, listFavorites, removeFavorite } from '../lib/favorites';
import { useAuth } from './AuthContext';

type FavoriteCoinInput = Pick<CmcCoin, 'id' | 'symbol' | 'name'>;

type FavoritesContextValue = {
  favorites: FavoriteCoin[];
  loading: boolean;
  error: string | null;
  isFavorite: (coinId: number) => boolean;
  toggleFavorite: (coin: FavoriteCoinInput) => Promise<{ error: string | null }>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setFavorites([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setFavorites(await listFavorites());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.coin_id)), [favorites]);

  const isFavorite = useCallback((coinId: number) => favoriteIds.has(coinId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (coin: FavoriteCoinInput): Promise<{ error: string | null }> => {
      const wasFavorite = favoriteIds.has(coin.id);

      if (!wasFavorite && favorites.length >= FAVORITES_LIMIT) {
        return { error: `You can only favorite up to ${FAVORITES_LIMIT} coins` };
      }

      setFavorites((prev) =>
        wasFavorite
          ? prev.filter((f) => f.coin_id !== coin.id)
          : [
              { coin_id: coin.id, symbol: coin.symbol, name: coin.name, created_at: new Date().toISOString() },
              ...prev,
            ]
      );

      try {
        if (wasFavorite) {
          await removeFavorite(coin.id);
        } else {
          await addFavorite(coin);
        }
        return { error: null };
      } catch (e) {
        await refresh();
        return { error: e instanceof Error ? e.message : 'Failed to update favorites' };
      }
    },
    [favoriteIds, favorites.length, refresh]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, loading, error, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
