import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { EXPERTS } from '@/constants/experts';
import { useExperts } from '@/lib/experts';
import { useArticles } from '@/lib/articles';
import {
  SLOT_HOME_ARTICLES, SLOT_HOME_EXPERTS, setFeaturedList, useFeaturedList,
} from '@/lib/featured';

const MAX_ARTICLES = 5;
const MAX_EXPERTS = 3;

export default function AdminFeatured() {
  const router = useRouter();
  const { role } = useAuth();
  const { articles } = useArticles();
  const { experts: dbExperts } = useExperts();

  const chosenArticles = useFeaturedList(SLOT_HOME_ARTICLES);
  const chosenExperts = useFeaturedList(SLOT_HOME_EXPERTS);
  const [busy, setBusy] = useState<string | null>(null);

  const expertList = useMemo(
    () => (dbExperts && dbExperts.length ? dbExperts : EXPERTS),
    [dbExperts]
  );

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <View style={styles.locked}><Text style={styles.lockedText}>This area is for admins only.</Text></View>
      </SafeAreaView>
    );
  }

  const toggle = async (slot: string, current: string[], id: string, max: number) => {
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : current.length >= max ? current : [...current, id];
    setBusy(slot);
    await setFeaturedList(slot, next);
    setBusy(null);
  };

  const clear = async (slot: string) => {
    setBusy(slot);
    await setFeaturedList(slot, []);
    setBusy(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Back onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Featured on home</Text>
        <Text style={styles.sub}>
          Pick nothing and the homepage shuffles daily on its own. Pick something and it shows
          exactly that, in the order you choose.
        </Text>

        <Section
          title="What readers are loving"
          meta={chosenArticles.length ? `${chosenArticles.length} of ${MAX_ARTICLES} chosen` : 'Automatic, shuffles daily'}
          busy={busy === SLOT_HOME_ARTICLES}
          onClear={chosenArticles.length ? () => clear(SLOT_HOME_ARTICLES) : undefined}
        />
        {articles.length === 0 ? (
          <Text style={styles.empty}>No articles to choose from yet.</Text>
        ) : (
          articles.map((a) => (
            <Option
              key={a.id}
              label={a.title}
              sub={a.category}
              position={chosenArticles.indexOf(a.id)}
              onPress={() => toggle(SLOT_HOME_ARTICLES, chosenArticles, a.id, MAX_ARTICLES)}
              full={chosenArticles.length >= MAX_ARTICLES && !chosenArticles.includes(a.id)}
            />
          ))
        )}

        <View style={{ height: 14 }} />

        <Section
          title="This week's expert highlight"
          meta={chosenExperts.length ? `${chosenExperts.length} of ${MAX_EXPERTS} chosen` : 'Automatic, shuffles daily'}
          busy={busy === SLOT_HOME_EXPERTS}
          onClear={chosenExperts.length ? () => clear(SLOT_HOME_EXPERTS) : undefined}
        />
        {expertList.map((e: any) => (
          <Option
            key={e.id}
            label={e.name}
            sub={e.title}
            position={chosenExperts.indexOf(e.id)}
            onPress={() => toggle(SLOT_HOME_EXPERTS, chosenExperts, e.id, MAX_EXPERTS)}
            full={chosenExperts.length >= MAX_EXPERTS && !chosenExperts.includes(e.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, meta, busy, onClear }: { title: string; meta: string; busy: boolean; onClear?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionMeta}>{meta}</Text>
      </View>
      {busy ? <ActivityIndicator color={COLORS.taupeBlue} /> : null}
      {onClear && !busy ? (
        <Pressable onPress={onClear} hitSlop={10}>
          <Text style={styles.clearText}>Automatic</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Option({ label, sub, position, onPress, full }: { label: string; sub?: string; position: number; onPress: () => void; full: boolean }) {
  const on = position >= 0;
  return (
    <Pressable style={[styles.opt, on && styles.optOn, full && styles.optFull]} onPress={onPress} disabled={full}>
      <View style={[styles.mark, on && styles.markOn]}>
        {on ? <Text style={styles.markText}>{position + 1}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optLabel} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={styles.optSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Admin</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 56 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 8 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lockedText: { fontSize: 15, color: COLORS.muted },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink },
  sectionMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  clearText: { fontSize: 13, color: COLORS.taupeBlue },
  empty: { fontSize: 14, color: COLORS.muted, paddingVertical: 12 },

  opt: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  optOn: { borderColor: COLORS.taupeBlue },
  optFull: { opacity: 0.45 },
  mark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: COLORS.taupeBlue, borderColor: COLORS.taupeBlue },
  markText: { color: COLORS.bg, fontSize: 12 },
  optLabel: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  optSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
