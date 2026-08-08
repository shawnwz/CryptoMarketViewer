import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export default function TabsLayout() {
  const router = useRouter();

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
            <Ionicons name="settings-outline" size={24} color="#111" />
          </Pressable>
        ),
        tabBarActiveTintColor: '#2563eb',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Market',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => <Ionicons name="star-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logo: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5, marginLeft: 16 },
  settingsButton: { marginRight: 16, padding: 4 },
});
