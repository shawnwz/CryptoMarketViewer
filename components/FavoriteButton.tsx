import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useFavoriteLists } from '../contexts/FavoriteListsContext';
import { useTheme } from '../contexts/ThemeContext';
import type { CmcCoin } from '../lib/coinmarketcap';
import { AddToListSheet } from './AddToListSheet';

type Props = {
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const FAVORITE_COLOR = '#f59e0b';

export function FavoriteButton({ coin, size = 22, style }: Props) {
  const { listsForCoin } = useFavoriteLists();
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const isFavorite = listsForCoin(coin.id).length > 0;

  return (
    <>
      <Pressable onPress={() => setSheetVisible(true)} hitSlop={10} style={style}>
        <Ionicons
          name={isFavorite ? 'star' : 'star-outline'}
          size={size}
          color={isFavorite ? FAVORITE_COLOR : colors.textMuted}
        />
      </Pressable>
      <AddToListSheet visible={sheetVisible} coin={coin} onClose={() => setSheetVisible(false)} />
    </>
  );
}
