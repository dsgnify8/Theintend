import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function Workbooks() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text-outline" size={28} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>Workbooks</Text>
        <Text style={styles.body}>Guided workbooks from your experts are coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 23, color: COLORS.muted, textAlign: 'center' },
});
