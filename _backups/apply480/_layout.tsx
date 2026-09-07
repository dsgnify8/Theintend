import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/brand';
import { DURATION, reduceMotion } from '@/constants/motion';

// During development the app opens straight to Home. Sign-in lives in the You tab.
// Before launch we will gate this behind login again.
export default function TabsLayout() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    let alive = true;
    reduceMotion().then((on) => { if (alive) setStill(on); });
    return () => { alive = false; };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: still ? 'none' : 'fade',
        transitionSpec: { animation: 'timing', config: { duration: DURATION.colour } },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: COLORS.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="experts" options={{ title: 'Experts', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="read" options={{ title: 'Library', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="sessions" options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
