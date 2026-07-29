import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { EXPERTS } from '@/constants/experts';
import { LIBRARY } from '@/constants/library';
import { PROGRAMS } from '@/constants/sessions';
import { useArticles } from '@/lib/articles';
import { clearFeatured, setFeatured, useFeatured } from '@/lib/featured';

type Slot = 'expert' | 'ebook' | 'article' | 'program';

export default function AdminFeatured() {
  const router = useRouter();
  const { role } = useAuth();
  const featured = useFeatured();
  const { articles } = useArticles();
  const [open, setOpen] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  const ebooks = LIBRARY.filter((l) => l.type === 'E-book');

  const nameFor = (slot: Slot, id?: string): string => {
    if (!id) return 'Not set';
    if (slot === 'expert') return EXPERTS.find((e) => e.id === id)?.name ?? id;
    if (slot === 'ebook') return LIBRARY.find((l) => l.id === id)?.title ?? id;
    if (slot === 'article') return articles.find((a) => a.id === id)?.title ?? id;
    return PROGRAMS.find((p: any) => p.id === id)?.title ?? id;
  };

  const options = (slot: Slot): { id: string; label: string; sub?: string }[] => {
    if (slot === 'expert') return EXPERTS.map((e) => ({ id: e.id, label: e.name, sub: e.title }));
    if (slot === 'ebook') return ebooks.map((l) => ({ id: l.id, label: l.title, sub: l.author }));
    if (slot === 'article') return articles.map((a) => ({ id: a.id, label: a.title, sub: a.category }));
    return (PROGRAMS as any[]).map((p) => ({ id: p.id, label: p.title, sub: p.expertName }));
  };

  const pick = async (slot: Slot, id: string) => {
    setBusy(true);
    await setFeatured(slot, id);
    setBusy(false);
    setOpen(null);
  };

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <View style={styles.locked}><Text style={styles.lockedText}>This area is for admins only.</Text></View>
      </SafeAreaView>
    );
  }

  const SLOTS: { slot: Slot; label: string; icon: any }[] = [
    { slot: 'expert', label: 'Featured expert', icon: 'person-outline' },
    { slot: 'ebook', label: 'Featured e-book', icon: 'book-outline' },
    { slot: 'article', label: 'Featured article', icon: 'document-text-outline' },
    { slot: 'program', label: 'Featured program', icon: 'ribbon-outline' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Back onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Featured on home</Text>
        <Text style={styles.sub}>Choose what the homepage highlights. Leave a slot unset and the home page falls back to the newest on its own.</Text>

        {SLOTS.map(({ slot, label, icon }) => (
          <Pressable key={slot} style={styles.row} onPress={() => setOpen(slot)}>
            <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={COLORS.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{nameFor(slot, featured[slot])}</Text>
            </View>
            {featured[slot] ? (
              <Pressable onPress={() => clearFeatured(slot)} hitSlop={10} style={{ marginRight: 6 }}>
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </Pressable>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={open !== null} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(null)} />
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose</Text>
            {busy ? <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} /> : null}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {open ? options(open).map((o) => {
                const on = featured[open] === o.id;
                return (
                  <Pressable key={o.id} style={styles.opt} onPress={() => pick(open, o.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optLabel} numberOfLines={1}>{o.label}</Text>
                      {o.sub ? <Text style={styles.optSub} numberOfLines={1}>{o.sub}</Text> : null}
                    </View>
                    {on ? <Ionicons name="checkmark" size={18} color={COLORS.accent} /> : null}
                  </Pressable>
                );
              }) : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
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
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 22 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lockedText: { fontSize: 15, color: COLORS.muted },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowLabel: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  rowValue: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 12 },
  opt: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 15, marginBottom: 8 },
  optLabel: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  optSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
