import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from '@/components/Img';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { socialUrl, useExpert } from '@/lib/experts';
import { EXPERTS } from '@/constants/experts';
import { useLiked, toggleLiked } from '@/lib/store';
import { FramedImage } from '@/components/FramedImage';
import { useSessions } from '@/lib/sessions';
import { useServices } from '@/lib/services';
import { COLORS, FONT_ITALIC, FONT_SANS, FONT_SERIF } from '@/constants/brand';
import { HEALTH_PROGRAMS, HEALTH_PROGRAM_EXPERT_ID, HEALTH_PROGRAM_PRICE_USD } from '@/constants/healthPrograms';

export default function ExpertProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flip = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [chosen, setChosen] = useState<any | null>(null);
  const [mode, setMode] = useState<'online' | 'inperson' | null>(null);
  const doFlip = () => {
    Animated.spring(flip, { toValue: flipped ? 0 : 1, useNativeDriver: true, friction: 8, tension: 12 }).start();
    setFlipped((v) => !v);
  };
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const { expert, loading } = useExpert(id);
  const { classes: CLASSES, programs: PROGRAMS } = useSessions();
  const { services: ALL_SERVICES } = useServices();
  const likedIds = useLiked();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!expert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <Text style={styles.missing}>Expert not found.</Text>
      </SafeAreaView>
    );
  }

  const services = ALL_SERVICES.filter((s) => s.expertId === expert.id);
  const classes = CLASSES.filter((c) => c.expertId === expert.id);
  const programs = PROGRAMS.filter((p) => p.expertId === expert.id);
  const singleServices = services.filter((s: any) => s.kind !== 'package');
  const packageServices = services.filter((s: any) => s.kind === 'package');
  const firstName = expert.name.replace('Dr. ', '').split(' ')[0];
  const isOmar = expert.id === 'omar-chtioui';
  // Photos are framed head-near-top; bias the default crop down to show faces.
  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');
  const liked = likedIds.includes(expert.id);

  // "Where I can help" keywords come from the expert's focus areas + category.
  const kw = EXPERTS.find((e) => e.id === expert.id)?.keywords;
  const helpTags = (kw && kw.length > 0)
    ? kw
    : Array.from(new Set([...expert.title.split('·').map((t) => t.trim()), expert.category].filter(Boolean)));

  const offerMeta = (s: any) => {
    const parts: string[] = [];
    const loc = s.location ? ` (${s.location})` : '';
    const mode = s.online && s.inPerson ? `Online or in person${loc}` : s.online ? 'Online' : s.inPerson ? `In person${loc}` : '';
    if (s.kind === 'package' && s.sessionsTotal) parts.push(`${s.sessionsTotal} sessions`);
    if (s.tagline) parts.push(s.tagline);
    if (s.kind !== 'package' && s.durationMin) parts.push(`${s.durationMin} min`);
    if (s.price) parts.push(/free/i.test(s.price) ? 'Free' : s.price);
    return (mode ? mode + ' · ' : '') + parts.join(' · ');
  };
  const svcMeta = (s: { durationMin: number | null; price: string }) => {
    const parts: string[] = [];
    if (s.durationMin) parts.push(`${s.durationMin} min`);
    if (s.price) parts.push(s.price);
    return parts.join(' · ');
  };

  const onShare = () => {
    Share.share({
      message: `${expert.name}, ${expert.title} on The Intend. ${expert.profileUrl}`,
      url: expert.profileUrl,
    }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Experts</Text>
        </Pressable>
        <View style={styles.topRight}>
          <Pressable style={styles.shareBtn} onPress={() => toggleLiked(expert.id)} hitSlop={10}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? COLORS.accent : COLORS.ink} />
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={onShare} hitSlop={10}>
            <Ionicons name="share-outline" size={20} color={COLORS.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={doFlip} style={styles.flipWrap}>
          <Animated.View style={[styles.flipFace, styles.coverFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
            {expert.photo ? (
              <Image source={{ uri: expert.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
                <Text style={styles.coverInitials}>{initials}</Text>
              </View>
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.82)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.coverBody}>
              <Text style={styles.coverName}>{expert.name}</Text>
              <Text style={styles.coverTitle}>{expert.title.toUpperCase()}</Text>
            </View>
            <View style={styles.coverTapHint}>
              <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
              <Text style={styles.coverTapText}>TAP</Text>
            </View>
          </Animated.View>
          <Animated.View style={[styles.flipFace, styles.flipBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}>
            <View style={styles.verifyBadge}>
              <Ionicons name="shield-checkmark" size={28} color={COLORS.bg} />
            </View>
            <Text style={styles.verifyTitle}>All our experts are verified</Text>
            <Text style={styles.verifyText}>Every expert on The Intend has been identity verified, personally worked with, and tested before joining the platform.</Text>
          </Animated.View>
        </Pressable>

        {helpTags.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Where I can help</Text>
            <View style={styles.tagsRow}>
              {helpTags.map((t) => (
                <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Approach</Text>
        <Text style={styles.body}>{expert.bio}</Text>

        <Text style={styles.sectionTitle}>Sessions</Text>
        {singleServices.length > 0 ? (
          singleServices.map((s) => (
            <OfferingRow key={s.id} icon="person-outline" title={s.name} meta={offerMeta(s)} onPress={() => router.push(`/book/${expert.id}?service=${s.id}`)} />
          ))
        ) : (
          <OfferingRow icon="person-outline" title="1:1 consultation" meta="Online or in person" onPress={() => router.push(`/book/${expert.id}`)} />
        )}

        {packageServices.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Programs</Text>
            {packageServices.map((s) => (
              <OfferingRow key={s.id} icon="albums-outline" title={s.name} meta={offerMeta(s)} onPress={() => router.push(`/book/${expert.id}?service=${s.id}`)} />
            ))}
          </>
        ) : null}

        {expert.id === HEALTH_PROGRAM_EXPERT_ID ? (
          <Pressable style={styles.hpStrip} onPress={() => router.push('/health-programs')}>
            <LinearGradient
              colors={['#2E2721', '#3A322A', '#241F1B']}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(241,228,190,0.16)', 'rgba(241,228,190,0)']}
              style={styles.hpStripHalo}
              pointerEvents="none"
            />
            <Text style={styles.hpStripLabel}>PROGRAMS BY {expert.name.replace('Dr. ', '').split(' ')[0].toUpperCase()}</Text>
            {HEALTH_PROGRAMS.slice(0, 3).map((hp) => (
              <View key={hp.id} style={styles.hpStripRow}>
                <View style={styles.hpStripDot} />
                <Text style={styles.hpStripName} numberOfLines={1}>{hp.title}</Text>
              </View>
            ))}
            <View style={styles.hpStripFoot}>
              <Text style={styles.hpStripMore}>
                and {HEALTH_PROGRAMS.length - 3} more, from ${HEALTH_PROGRAM_PRICE_USD}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.pastel} />
            </View>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>
          Client <Text style={styles.sectionTitleItalic}>Questions</Text>
        </Text>
        {expert.faqs.map((q, i) => (
          <View key={i} style={styles.cqCard}>
            <Text style={styles.cqMark}>{'\u201C'}</Text>
            <Text style={styles.cqText}>{q}</Text>
          </View>
        ))}

        <SocialRow expert={expert} />

        <Pressable
          style={styles.bookBtn}
          onPress={() => {
            if (services.length === 0) { router.push(`/book/${expert.id}`); return; }
            if (services.length === 1) {
              const s0: any = services[0];
              if (s0.online && s0.inPerson) { setChosen(s0); setMode(null); setBookOpen(true); }
              else { router.push(`/book/${expert.id}?service=${s0.id}`); }
              return;
            }
            setChosen(null); setMode(null); setBookOpen(true);
          }}
        >
          <Text style={styles.bookText}>Book with {firstName}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={bookOpen} transparent animationType="slide" onRequestClose={() => setBookOpen(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setBookOpen(false)} />
          <SafeAreaView edges={['bottom']} style={styles.bookSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Book with {firstName}</Text>
            <Text style={styles.sheetSub}>{chosen ? 'How would you like to meet?' : 'Choose what you would like.'}</Text>

            {!chosen ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {singleServices.length > 0 ? <Text style={styles.sheetGroup}>SESSIONS</Text> : null}
                {singleServices.map((s: any) => (
                  <Pressable key={s.id} style={styles.sheetOffer} onPress={() => {
                    if (s.online && s.inPerson) { setChosen(s); setMode(null); }
                    else { setBookOpen(false); router.push(`/book/${expert.id}?service=${s.id}`); }
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetOfferTitle}>{s.name}</Text>
                      <Text style={styles.sheetOfferMeta}>{offerMeta(s)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                  </Pressable>
                ))}
                {packageServices.length > 0 ? <Text style={styles.sheetGroup}>PROGRAMS</Text> : null}
                {packageServices.map((s: any) => (
                  <Pressable key={s.id} style={styles.sheetOffer} onPress={() => {
                    if (s.online && s.inPerson) { setChosen(s); setMode(null); }
                    else { setBookOpen(false); router.push(`/book/${expert.id}?service=${s.id}`); }
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetOfferTitle}>{s.name}</Text>
                      <Text style={styles.sheetOfferMeta}>{offerMeta(s)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View>
                <Pressable style={styles.chosenRow} onPress={() => { setChosen(null); setMode(null); }}>
                  <Ionicons name="chevron-back" size={18} color={COLORS.accent} />
                  <Text style={styles.chosenName}>{chosen.name}</Text>
                </Pressable>
                <View style={styles.modeRow}>
                  <Pressable style={[styles.modeCard, mode === 'online' && styles.modeCardOn]} onPress={() => setMode('online')}>
                    <Ionicons name="videocam-outline" size={22} color={mode === 'online' ? COLORS.bg : COLORS.accent} />
                    <Text style={[styles.modeText, mode === 'online' && styles.modeTextOn]}>Online</Text>
                  </Pressable>
                  <Pressable style={[styles.modeCard, mode === 'inperson' && styles.modeCardOn]} onPress={() => setMode('inperson')}>
                    <Ionicons name="location-outline" size={22} color={mode === 'inperson' ? COLORS.bg : COLORS.accent} />
                    <Text style={[styles.modeText, mode === 'inperson' && styles.modeTextOn]}>In person</Text>
                    {chosen.location ? <Text style={[styles.modeLoc, mode === 'inperson' && styles.modeTextOn]}>{chosen.location}</Text> : null}
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.continueBtn, !mode && styles.continueOff]}
                  disabled={!mode}
                  onPress={() => { setBookOpen(false); router.push(`/book/${expert.id}?service=${chosen.id}&mode=${mode}`); }}
                >
                  <Text style={styles.continueText}>Continue to calendar</Text>
                </Pressable>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function OfferingRow({ icon, title, meta, onPress }: { icon: any; title: string; meta: string; onPress: () => void }) {
  return (
    <Pressable style={styles.offerRow} onPress={onPress}>
      <View style={styles.offerIcon}>
        <Ionicons name={icon} size={18} color={COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.offerTitle}>{title}</Text>
        {meta ? <Text style={styles.offerMeta}>{meta}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Experts</Text>
    </Pressable>
  );
}

// The ones filled in, and nothing at all when none have been.
function SocialRow({ expert }: { expert: any }) {
  const links = ([
    ['instagram', 'logo-instagram', expert.instagram],
    ['tiktok', 'logo-tiktok', expert.tiktok],
    ['twitter', 'logo-twitter', expert.twitter],
  ] as const)
    .map(([kind, icon, value]) => ({ icon, url: socialUrl(kind, value) }))
    .filter((x) => !!x.url);

  if (!links.length) return null;

  return (
    <View style={styles.socialRow}>
      {links.map((l) => (
        <Pressable
          key={l.icon}
          style={styles.socialBtn}
          hitSlop={8}
          onPress={() => { if (l.url) Linking.openURL(l.url).catch(() => {}); }}
        >
          <Ionicons name={l.icon as any} size={17} color={COLORS.accent} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  head: { alignItems: 'center', paddingVertical: 12 },
  flipWrap: { height: 300, marginTop: 8, marginBottom: 4 },
  flipFace: { position: 'absolute', width: '100%', height: '100%', borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backfaceVisibility: 'hidden' },
  flipFront: { backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  coverFront: { borderRadius: 22, overflow: 'hidden', padding: 0, alignItems: 'stretch', justifyContent: 'flex-end', backgroundColor: COLORS.accentSoft },
  coverFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent },
  coverInitials: { fontFamily: FONT_SERIF, fontSize: 64, color: COLORS.bg },
  coverBody: { padding: 22, alignItems: 'center' },
  coverName: { fontFamily: FONT_SERIF, fontSize: 30, lineHeight: 35, color: '#FFFFFF', textAlign: 'center' },
  coverTitle: { fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)', marginTop: 8, textAlign: 'center' },
  coverTapHint: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  coverTapText: { fontSize: 9, letterSpacing: 1.5, color: '#FFFFFF' },
  flipBack: { backgroundColor: COLORS.taupe },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  tapHintText: { fontSize: 10, letterSpacing: 1, color: COLORS.accent },
  verifyBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  verifyTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.bg, textAlign: 'center', marginBottom: 10 },
  verifyText: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
  verifyTapBack: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 14 },
  avatar: { width: 132, height: 132, borderRadius: 24, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 34, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, textAlign: 'center' },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  hpStrip: { borderRadius: 20, overflow: 'hidden', padding: 20, marginTop: 28 },
  hpStripHalo: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  hpStripLabel: { fontSize: 9.5, letterSpacing: 2.4, color: 'rgba(255,255,255,0.55)', marginBottom: 14 },
  hpStripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  hpStripDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.pastel, opacity: 0.7 },
  hpStripName: { flex: 1, fontFamily: FONT_SERIF, fontSize: 15, color: '#FFFFFF' },
  hpStripFoot: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)' },
  hpStripMore: { flex: 1, fontSize: 12, color: COLORS.pastel, opacity: 0.9 },
  sectionTitleItalic: { fontFamily: FONT_ITALIC, fontSize: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  tagText: { fontSize: 13, color: COLORS.ink },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  offerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  offerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  offerTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  offerMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  cqCard: { borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 2, paddingBottom: 18 },
  cqMark: { fontFamily: FONT_SERIF, fontSize: 68, lineHeight: 62, color: COLORS.accent, opacity: 0.10 },
  cqText: { fontFamily: FONT_SANS, fontSize: 14, lineHeight: 22, color: COLORS.taupe, marginTop: -20 },
  socialRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  socialBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  bookBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  bookText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  bookSheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink },
  sheetSub: { fontSize: 14, color: COLORS.muted, marginTop: 6, marginBottom: 16 },
  sheetGroup: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, marginTop: 8, marginBottom: 10 },
  sheetOffer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  sheetOfferTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  sheetOfferMeta: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  chosenRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  chosenName: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 22, gap: 8 },
  modeCardOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  modeText: { fontSize: 14, color: COLORS.ink },
  modeTextOn: { color: COLORS.bg },
  modeLoc: { fontSize: 11, color: COLORS.muted },
  continueBtn: { marginTop: 20, marginBottom: 8, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  continueOff: { opacity: 0.5 },
  continueText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
});

