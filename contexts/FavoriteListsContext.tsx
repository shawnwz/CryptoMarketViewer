import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CmcCoin } from '../lib/coinmarketcap';
import {
  addCoinToList,
  createFavoriteList,
  deleteFavoriteList,
  FavoriteList,
  FavoriteListCoin,
  LIST_COIN_LIMIT,
  listAllFavoriteListCoins,
  listFavoriteLists,
  removeCoinFromList,
  renameFavoriteList,
} from '../lib/favoriteLists';
import { useAuth } from './AuthContext';

type FavoriteCoinInput = Pick<CmcCoin, 'id' | 'symbol' | 'name'>;

type FavoriteListsContextValue = {
  lists: FavoriteList[];
  listCoins: FavoriteListCoin[];
  loading: boolean;
  listsForCoin: (coinId: number) => FavoriteList[];
  isInList: (listId: string, coinId: number) => boolean;
  toggleCoinInList: (listId: string, coin: FavoriteCoinInput) => Promise<{ error: string | null }>;
  createList: (name: string) => Promise<{ list: FavoriteList | null; error: string | null }>;
  renameList: (listId: string, name: string) => Promise<{ error: string | null }>;
  deleteList: (listId: string) => Promise<{ error: string | null }>;
};

const FavoriteListsContext = createContext<FavoriteListsContextValue | undefined>(undefined);

export function FavoriteListsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [listCoins, setListCoins] = useState<FavoriteListCoin[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setLists([]);
      setListCoins([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [listsResult, coinsResult] = await Promise.all([listFavoriteLists(), listAllFavoriteListCoins()]);
      setLists(listsResult);
      setListCoins(coinsResult);
    } catch {
      // Leave the previous state in place rather than wiping the UI on a transient failure.
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const listsForCoin = useCallback(
    (coinId: number) => {
      const listIds = new Set(listCoins.filter((c) => c.coin_id === coinId).map((c) => c.list_id));
      return lists.filter((l) => listIds.has(l.id));
    },
    [lists, listCoins]
  );

  const isInList = useCallback(
    (listId: string, coinId: number) => listCoins.some((c) => c.list_id === listId && c.coin_id === coinId),
    [listCoins]
  );

  const toggleCoinInList = useCallback(
    async (listId: string, coin: FavoriteCoinInput): Promise<{ error: string | null }> => {
      const alreadyIn = isInList(listId, coin.id);

      if (!alreadyIn) {
        const countInList = listCoins.filter((c) => c.list_id === listId).length;
        if (countInList >= LIST_COIN_LIMIT) {
          return { error: `You can only add up to ${LIST_COIN_LIMIT} coins to a list` };
        }
      }

      setListCoins((prev) =>
        alreadyIn
          ? prev.filter((c) => !(c.list_id === listId && c.coin_id === coin.id))
          : [
              {
                list_id: listId,
                coin_id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                added_at: new Date().toISOString(),
              },
              ...prev,
            ]
      );

      try {
        if (alreadyIn) {
          await removeCoinFromList(listId, coin.id);
        } else {
          await addCoinToList(listId, coin);
        }
        return { error: null };
      } catch (e) {
        await refresh();
        return { error: e instanceof Error ? e.message : 'Failed to update favorites' };
      }
    },
    [isInList, listCoins, refresh]
  );

  const createList = useCallback(
    async (name: string): Promise<{ list: FavoriteList | null; error: string | null }> => {
      try {
        const list = await createFavoriteList(name);
        setLists((prev) => [...prev, list]);
        return { list, error: null };
      } catch (e) {
        return { list: null, error: e instanceof Error ? e.message : 'Failed to create list' };
      }
    },
    []
  );

  const renameList = useCallback(
    async (listId: string, name: string): Promise<{ error: string | null }> => {
      const previous = lists;
      setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, name } : l)));
      try {
        await renameFavoriteList(listId, name);
        return { error: null };
      } catch (e) {
        setLists(previous);
        return { error: e instanceof Error ? e.message : 'Failed to rename list' };
      }
    },
    [lists]
  );

  const deleteList = useCallback(
    async (listId: string): Promise<{ error: string | null }> => {
      const previousLists = lists;
      const previousCoins = listCoins;
      setLists((prev) => prev.filter((l) => l.id !== listId));
      setListCoins((prev) => prev.filter((c) => c.list_id !== listId));
      try {
        await deleteFavoriteList(listId);
        return { error: null };
      } catch (e) {
        setLists(previousLists);
        setListCoins(previousCoins);
        return { error: e instanceof Error ? e.message : 'Failed to delete list' };
      }
    },
    [lists, listCoins]
  );

  const value = useMemo(
    () => ({ lists, listCoins, loading, listsForCoin, isInList, toggleCoinInList, createList, renameList, deleteList }),
    [lists, listCoins, loading, listsForCoin, isInList, toggleCoinInList, createList, renameList, deleteList]
  );

  return <FavoriteListsContext.Provider value={value}>{children}</FavoriteListsContext.Provider>;
}

export function useFavoriteLists() {
  const ctx = useContext(FavoriteListsContext);
  if (!ctx) throw new Error('useFavoriteLists must be used within a FavoriteListsProvider');
  return ctx;
}
