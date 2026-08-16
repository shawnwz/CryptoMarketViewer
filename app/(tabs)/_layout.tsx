import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../lib/theme';

export default function TabsLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Tabs
      screenOptions={{
        headerLeft: () => <Text style={styles.logo}>CRYPTOMARKETVIEWER</Text>,
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
        ),
        headerStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.market'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          headerShown: false,
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('tabs.news'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: t('tabs.portfolio'),
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    logo: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5, marginLeft: 16, color: colors.text },
    settingsButton: { marginRight: 16, padding: 4 },
  });
}
