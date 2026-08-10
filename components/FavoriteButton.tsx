import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useFavoriteLists } from '../contexts/FavoriteListsContext';
import type { CmcCoin } from '../lib/coinmarketcap';
import { AddToListSheet } from './AddToListSheet';

type Props = {
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function FavoriteButton({ coin, size = 22, style }: Props) {
  const { listsForCoin } = useFavoriteLists();
  const [sheetVisible, setSheetVisible] = useState(false);
  const isFavorite = listsForCoin(coin.id).length > 0;

  return (
    <>
      <Pressable onPress={() => setSheetVisible(true)} hitSlop={10} style={style}>
        <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={size} color={isFavorite ? '#f59e0b' : '#999'} />
      </Pressable>
      <AddToListSheet visible={sheetVisible} coin={coin} onClose={() => setSheetVisible(false)} />
    </>
  );
}
