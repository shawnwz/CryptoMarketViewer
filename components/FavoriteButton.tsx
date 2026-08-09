import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useFavorites } from '../contexts/FavoritesContext';
import type { CmcCoin } from '../lib/coinmarketcap';

type Props = {
  coin: Pick<CmcCoin, 'id' | 'symbol' | 'name'>;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function FavoriteButton({ coin, size = 22, style }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(coin.id);

  const handlePress = async () => {
    const { error } = await toggleFavorite(coin);
    if (error) {
      Alert.alert('Could not update favorites', error);
    }
  };

  return (
    <Pressable onPress={handlePress} hitSlop={10} style={style}>
      <Ionicons name={favorite ? 'star' : 'star-outline'} size={size} color={favorite ? '#f59e0b' : '#999'} />
    </Pressable>
  );
}
