import { StyleSheet, Text, View } from 'react-native';

export default function NewsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Crypto news coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 16, color: '#666' },
});
