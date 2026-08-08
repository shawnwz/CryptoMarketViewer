import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111" />
            </Pressable>
          ),
        }}
      />
      <Text style={styles.text}>Logged in as {user?.email}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 40, backgroundColor: '#fff' },
  text: { fontSize: 16, marginBottom: 24 },
  button: { backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontWeight: '600' },
  closeButton: { marginLeft: 16, padding: 4 },
});
