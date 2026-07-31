import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useArticles } from '@/lib/articles';
import { LIBRARY, type LibraryItem } from '@/constants/library';
import { SOUNDS, type Sound } from '@/constants/sounds';
import { WORKSHEETS } from '@/constants/worksheets';
import { useDraft } from '@/lib/worksheets';
import { useAuth } from '@/lib/auth';
import { useAppImages, uploadAppImage } from '@/lib/appImages';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';

type Practice = { key: string; label: string; line: string; icon: any; color: string; route: string };

const PRACTICES: Practice[] = [
  { key: 'practice:sounds', label: 'Sounds', line: 'Settle and rest', icon: 'musical-notes-outline', color: '#5A5B7A', route: '/sounds' },
  { key: 'practice:breathwork', label: 'Breathwork', line: 'Regulate the body', icon: 'leaf-outline', color: '#6F7A6B', route: '/breathwork' },
  { key: 'practice:journaling', label: 'Journaling', line: 'Think on paper', icon: 'create-outline', color: '#7C6F62', route: '/journaling' },
  { key: 'practice:affirmations', label: 'Affirmations', line: 'I am', icon: 'sparkles-outline', color: '#9A7B4F', route: '/affirmations' },
];

// A different order each day, the same order all day. Random on every render
// would reshuffle the shelf while you scroll it.
function shuffleToday<T>(list: T[]): T[] {
  let h = Math.floor(Date.now() / 86400000) + 2166136261;
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h) % (i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

// Behind the masthead, clearing before the shelves start.
const PAGE_WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

const TINT = COLORS.wash;
// Same tint with no alpha, so the gradient fades to nothing rather than to
// white. rgba is needed because a hex cannot carry the alpha stop.
const TINT_CLEAR = 'rgba(235,230,223,0)';

// A tinted section whose edges dissolve into the page instead of cutting.
function TintBand({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.band}>
      <LinearGradient
        colors={[TINT_CLEAR, TINT, TINT, TINT_CLEAR]}
        locations={[0, 0.16, 0.84, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

// Admin only: pick a photo and store it against this key.
async function pickAndSave(key: string, onBusy: (b: boolean) => void) {
  const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true });
  if (res.canceled || !res.assets?.[0]?.base64) return;
  onBusy(true);
  try {
    await uploadAppImage(key, res.assets[0].base64);
  } catch (e: any) {
    Alert.alert('Upload failed', e?.message ?? 'Could not save that image.');
  }
  onBusy(false);
}

export default function LibraryScreen() {
  const router = useRouter();
  const { loading, articles } = useArticles();
  const { role } = useAuth();
  const images = useAppImages();
  const isAdmin = role === 'admin';
  const lead = articles[0];

  const ebooks = useMemo(() => shuffleToday(LIBRARY.filter((i) => i.type === 'E-book')), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={PAGE_WASH} style={styles.pageWash} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.band, styles.masthead]}>
          <Text style={styles.kicker}>THE INTEND</Text>
          <Text style={styles.h1}>Library</Text>
          <View style={styles.titleRule} />
          <Text style={styles.sub}>Everything here is yours to use at your own pace.</Text>
        </View>

        <TintBand>
          <Text style={styles.sectionLabel}>PRACTICES</Text>
          {isAdmin ? <Text style={styles.adminHint}>Hold a tile to change its image</Text> : null}
          <View style={styles.grid}>
            {PRACTICES.map((p) => (
              <PracticeTile key={p.key} practice={p} uri={images[p.key]} isAdmin={isAdmin} />
            ))}
          </View>
        </TintBand>

        <View style={styles.band}>
          <Text style={styles.sectionLabel}>READ</Text>
          <Pressable style={styles.feature} onPress={() => router.push('/articles')}>
            {lead?.image ? (
              <ImageBackground source={{ uri: lead.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.accent }]} />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.featureBody}>
              <Text style={styles.featureEyebrow}>ARTICLES</Text>
              <Text style={styles.featureTitle}>
                The <Text style={styles.featureTitleAccent}>reading</Text> room
              </Text>
              <Text style={styles.featureLine}>
                {loading ? 'Essays and guides from our experts.' : `${articles.length} pieces on healing, patterns, money and the body.`}
              </Text>
              <View style={styles.featureCta}>
                <Text style={styles.featureCtaText}>Enter</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.ink} />
              </View>
            </View>
          </Pressable>
        </View>

        {ebooks.length ? (
          <TintBand>
            <Text style={styles.shelfTitle}>E-books</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
              {ebooks.map((i) => <TitleCard key={i.id} item={i} uri={images[`library:${i.id}`]} isAdmin={isAdmin} />)}
            </ScrollView>
          </TintBand>
        ) : null}

        {SOUNDS.length ? (
          <View style={styles.band}>
            <View style={styles.shelfHead}>
              <Text style={styles.shelfTitle}>Sounds & Frequencies</Text>
              <Pressable onPress={() => router.push('/sounds')} hitSlop={8}>
                <Text style={styles.seeAll}>See all {'\u203A'}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
              {SOUNDS.map((sd) => <SoundCard key={sd.id} sound={sd} uri={images[`sound:${sd.id}`]} isAdmin={isAdmin} />)}
            </ScrollView>
          </View>
        ) : null}

        <TintBand>
          <Text style={styles.shelfTitle}>Workbooks</Text>
          <View style={{ marginTop: 4 }}>
            {WORKSHEETS.map((w) => <WorkbookCard key={w.id} item={w} />)}
          </View>
        </TintBand>
      </ScrollView>
    </SafeAreaView>
  );
}

function PracticeTile({ practice, uri, isAdmin }: { practice: Practice; uri?: string; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      style={[styles.tile, !uri && { backgroundColor: practice.color }]}
      onPress={() => router.push(practice.route as any)}
      onLongPress={isAdmin ? () => pickAndSave(practice.key, setBusy) : undefined}
      delayLongPress={450}
    >
      {uri ? (
        <>
          <ImageBackground source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.78)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
      <Ionicons name={practice.icon} size={22} color={COLORS.bg} />
      <View style={{ flex: 1 }} />
      <Text style={styles.tileLabel}>{practice.label}</Text>
      <Text style={styles.tileLine}>{practice.line}</Text>
      {busy ? (
        <View style={styles.tileBusy}><ActivityIndicator color={COLORS.bg} /></View>
      ) : null}
    </Pressable>
  );
}

function TitleCard({ item, uri, isAdmin }: { item: LibraryItem; uri?: string; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const open = () => router.push(item.pdf || item.html ? `/ebook/${item.id}` : `/title/${item.id}`);
  return (
    <Pressable
      style={styles.shelfCard}
      onPress={open}
      onLongPress={isAdmin ? () => pickAndSave(`library:${item.id}`, setBusy) : undefined}
      delayLongPress={450}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.shelfCover} resizeMode="cover" />
      ) : item.cover ? (
        <Image source={item.cover} style={styles.shelfCover} resizeMode="cover" />
      ) : (
        <View style={[styles.shelfCover, styles.shelfCoverBlank, { backgroundColor: item.color }]}>
          <Ionicons name={item.type === 'Audiobook' ? 'headset-outline' : 'book-outline'} size={24} color="rgba(255,255,255,0.9)" />
        </View>
      )}
      {busy ? <View style={styles.coverBusy}><ActivityIndicator color={COLORS.bg} /></View> : null}
      <Text style={styles.shelfName} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.shelfAuthor} numberOfLines={1}>{item.author}</Text>
      <Text style={styles.shelfLen}>{item.length}</Text>
    </Pressable>
  );
}

function SoundCard({ sound, uri, isAdmin }: { sound: Sound; uri?: string; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      style={styles.shelfCard}
      onPress={() => router.push(`/sound/${sound.id}`)}
      onLongPress={isAdmin ? () => pickAndSave(`sound:${sound.id}`, setBusy) : undefined}
      delayLongPress={450}
    >
      <View style={styles.soundCover}>
        {uri ? (
          <ImageBackground source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: sound.color }]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="pulse-outline" size={22} color="rgba(255,255,255,0.9)" style={styles.soundGlyph} />
        <Text style={styles.soundDuration}>{sound.duration}</Text>
        {busy ? <View style={styles.soundBusy}><ActivityIndicator color={COLORS.bg} /></View> : null}
      </View>
      <Text style={styles.shelfName} numberOfLines={2}>{sound.title}</Text>
      <Text style={styles.soundPurpose} numberOfLines={2}>{sound.purpose}</Text>
    </Pressable>
  );
}

function WorkbookCard({ item }: { item: any }) {
  const router = useRouter();
  const draft = useDraft(item.id);
  const inProgress = !!draft && Object.values(draft.answers).some((v: any) => (v ?? '').trim().length > 0);
  return (
    <Pressable style={styles.wbCard} onPress={() => router.push(`/worksheet/${item.id}`)}>
      <View style={styles.wbTop}>
        <View style={styles.wbBadge}><Ionicons name="compass-outline" size={20} color={COLORS.ink} /></View>
        {inProgress ? <View style={styles.wbPill}><Text style={styles.wbPillText}>In progress</Text></View> : null}
      </View>
      <Text style={styles.wbTitle}>{item.title}</Text>
      <Text style={styles.wbSub}>{item.subtitle}</Text>
      <Text style={styles.wbBlurb}>{item.blurb}</Text>
      <View style={styles.wbFoot}>
        <Text style={styles.wbMeta}>{item.minutes}</Text>
        <View style={styles.wbStart}><Text style={styles.wbStartText}>{inProgress ? 'Resume' : 'Start'}</Text></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  pageWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  content: { paddingBottom: 90 },

  band: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26 },
  bandTint: { backgroundColor: TINT },

  masthead: { alignItems: 'center', paddingTop: 26, paddingBottom: 32 },
  titleRule: { width: 36, height: 1, backgroundColor: COLORS.accent, opacity: 0.5, marginTop: 16, marginBottom: 14 },
  kicker: { fontSize: 11, letterSpacing: 4, color: COLORS.muted, marginBottom: 14 },
  h1: { fontFamily: FONT_SERIF, fontSize: 44, lineHeight: 50, color: COLORS.ink, textAlign: 'center' },
  sub: { fontFamily: FONT_ITALIC, fontSize: 16, lineHeight: 23, color: COLORS.accent, textAlign: 'center', paddingHorizontal: 12 },

  sectionLabel: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginBottom: 14 },
  adminHint: { fontSize: 11, color: COLORS.accent, marginTop: -8, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48.5%', height: 148, borderRadius: 20, padding: 16, marginBottom: 12, overflow: 'hidden' },
  tileLabel: { fontFamily: FONT_SERIF, fontSize: 19, color: COLORS.bg },
  tileLine: { fontSize: 12, color: COLORS.bg, opacity: 0.8, marginTop: 3 },
  tileBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },

  feature: { height: 250, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  featureBody: { padding: 22 },
  featureEyebrow: { fontSize: 10, letterSpacing: 2.4, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  featureTitle: { fontFamily: FONT_SERIF, fontSize: 30, color: '#FFFFFF' },
  featureTitleAccent: { fontStyle: 'italic', color: '#E6C79B' },
  featureLine: { fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.86)', marginTop: 8 },
  featureCta: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: COLORS.bg, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, marginTop: 16 },
  featureCtaText: { fontSize: 13, letterSpacing: 0.4, color: COLORS.ink },

  shelfHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  seeAll: { fontSize: 13, color: COLORS.accent },
  shelfTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 14 },
  shelf: { gap: 16, paddingRight: 20 },
  shelfCard: { width: 142 },
  shelfCover: { width: 142, height: 196, borderRadius: 14, backgroundColor: COLORS.accentSoft },
  shelfCoverBlank: { alignItems: 'center', justifyContent: 'center' },
  coverBusy: { position: 'absolute', left: 0, right: 0, top: 0, height: 196, borderRadius: 14, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  shelfName: { fontFamily: FONT_SERIF, fontSize: 15, lineHeight: 20, color: COLORS.ink, marginTop: 10 },
  shelfAuthor: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  shelfLen: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  soundCover: { width: 142, height: 150, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  soundGlyph: { position: 'absolute', top: 12, left: 12 },
  soundDuration: { fontSize: 11, color: 'rgba(255,255,255,0.92)', padding: 12 },
  soundBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  soundPurpose: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginTop: 3 },

  wbCard: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14 },
  wbTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  wbBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.pastel, alignItems: 'center', justifyContent: 'center' },
  wbPill: { backgroundColor: COLORS.accentSoft, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  wbPillText: { fontSize: 11, letterSpacing: 0.5, color: COLORS.accent },
  wbTitle: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink },
  wbSub: { fontSize: 14, color: COLORS.accent, marginTop: 4 },
  wbBlurb: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 12 },
  wbFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  wbMeta: { fontSize: 13, color: COLORS.muted },
  wbStart: { backgroundColor: COLORS.pastel, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
  wbStartText: { color: COLORS.ink, fontSize: 14, letterSpacing: 0.5 },
});
