import * as SecureStore from 'expo-secure-store';

// SecureStore caps each value at ~2048 bytes on Android, but a Supabase
// session (access + refresh token) can exceed that. Split large values
// across multiple keys and reassemble them on read.
const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number) {
  return `${key}_${index}`;
}

export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunkCountRaw) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = parseInt(chunkCountRaw, 10);
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i)))
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStorageAdapter.removeItem(key);

    const chunkCount = Math.ceil(value.length / CHUNK_SIZE) || 1;
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
    await Promise.all(
      Array.from({ length: chunkCount }, (_, i) =>
        SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
      )
    );
  },

  async removeItem(key: string): Promise<void> {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCountRaw) {
      const chunkCount = parseInt(chunkCountRaw, 10);
      await Promise.all(
        Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i)))
      );
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};
