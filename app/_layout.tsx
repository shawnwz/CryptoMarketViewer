import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { FavoriteListsProvider } from '../contexts/FavoriteListsContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

const navFonts = Platform.select({
  ios: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '600' as const },
    heavy: { fontFamily: 'System', fontWeight: '700' as const },
  },
  default: {
    regular: { fontFamily: 'sans-serif', fontWeight: 'normal' as const },
    medium: { fontFamily: 'sans-serif-medium', fontWeight: 'normal' as const },
    bold: { fontFamily: 'sans-serif', fontWeight: '600' as const },
    heavy: { fontFamily: 'sans-serif', fontWeight: '700' as const },
  },
});

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
        <Stack.Screen name="coin/[id]" options={{ title: '', headerBackButtonDisplayMode: 'minimal' }} />
        <Stack.Screen name="portfolio/add" options={{ presentation: 'modal', title: '' }} />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedApp() {
  const { scheme, colors } = useTheme();

  const navTheme = {
    dark: scheme === 'dark',
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
    fonts: navFonts,
  };

  return (
    <NavigationThemeProvider value={navTheme}>
      <RootNavigator />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <FavoriteListsProvider>
            <ThemedApp />
          </FavoriteListsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
