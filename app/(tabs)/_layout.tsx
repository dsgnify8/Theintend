import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.brand}>THE INTEND</Text>
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 18 }} />
        <Text style={styles.status}>Starting…</Text>
        {showEscape ? (
          <Pressable style={styles.btn} onPress={() => router.replace('/login')}>
            <Text style={styles.btnText}>Continue to sign in</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: COLORS.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="experts" options={{ title: 'Experts', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="read" options={{ title: 'Library', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: FONT_SERIF, fontSize: 16, letterSpacing: 4, color: COLORS.ink },
  status: { fontSize: 13, color: COLORS.muted, marginTop: 12 },
  btn: { marginTop: 28, paddingVertical: 14, paddingHorizontal: 26, borderRadius: 999, backgroundColor: COLORS.accent },
  btnText: { color: COLORS.bg, fontSize: 15 },
});
