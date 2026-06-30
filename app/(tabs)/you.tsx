import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useArticles } from '@/lib/articles';
import { ACHIEVEMENTS } from '@/constants/achievements';
import { useBookings, useLiked, useReads, useReadStreak, useSaved, useWorksheetsDone, type Booking } from '@/lib/store';
import { useHydrateBookings } from '@/lib/bookings';
import { signOut, updateProfile, useAuth } from '@/lib/auth';
import { uploadAvatar } from '@/lib/upload';

const VIEWS = ['Overview', 'Saved', 'Bookings'];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STREAK = 4;
const RECORD = 5;

const NOTIFICATIONS = [
  { icon: 'videocam', title: 'Session reminder', body: 'Breath & the Nervous System starts soon.', time: '2h' },
  { icon: 'book', title: 'Continue reading', body: 'Pick up where you left off in your last article.', time: '5h' },
  { icon: 'flame', title: 'Keep your streak', body: "You're on a 4-day streak. Don't lose it today.", time: '1d' },
  { icon: 'sparkles', title: 'New from your expert', body: 'Omar Chtioui just added a new program.', time: '2d' },
];

export default function YouScreen() {
  const router = useRouter();
  const { session, profile, role } = useAuth();
  const [view, setView] = useState('Overview');
  const [notifOpen, setNotifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savedIds = useSaved();
  const likedIds = useLiked();
  const reads = useReads();
  const worksheetsDone = useWorksheetsDone();
  const streakInfo = useReadStreak();
  const bookings = useBookings();
  useHydrateBookings();
  const { articles } = useArticles();
  const saved = articles.filter((a) => savedIds.includes(a.id));
  const liked = articles.filter((a) => likedIds.includes(a.id));

  const loggedIn = !!session;
  const displayName = loggedIn ? (profile?.full_name || 'You') : 'Welcome';
  const initials = loggedIn && profile?.full_name ? profile.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('') : '·';

  const pickAndUpload = async () => {
    if (!loggedIn) {
      router.push('/login');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(session.user.id, res.assets[0].base64);
      await updateProfile({ avatar_url: url });
    } catch (e) {
      console.warn('avatar upload failed', e);
    }
    setUploading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>You</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable onPress={() => setNotifOpen(true)} hitSlop={10}>
            <Ionicons name="notifications-outline" size={23} color={COLORS.ink} />
            <View style={styles.bellDot} />
          </Pressable>
          <Pressable
            onPress={async () => { if (loggedIn) { await signOut(); } router.push('/login'); }}
            hitSlop={10}
          >
            <Ionicons name={loggedIn ? 'log-out-outline' : 'log-in-outline'} size={23} color={COLORS.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
              {uploading ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color={COLORS.bg} />
                </View>
              ) : null}
            </View>
            <Pressable style={styles.cameraBadge} onPress={pickAndUpload} hitSlop={8}>
              <Ionicons name="camera" size={13} color={COLORS.bg} />
            </Pressable>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {loggedIn ? (
            <>
              <Text style={styles.handle}>{profile?.email || 'Your space at The Intend'}</Text>
              {role !== 'user' ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{role.toUpperCase()}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.handle}>Sign in to sync your space across devices</Text>
              <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
                <Text style={styles.signInText}>Sign in or create account</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.segment}>
          {VIEWS.map((v) => {
            const on = v === view;
            return (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.segItem, on && styles.segItemOn]}>
                <Text style={[styles.segText, on && styles.segTextOn]}>{v}</Text>
              </Pressable>
            );
          })}
        </View>

        {view === 'Overview' ? (
          <View>
            <MoodInsightCard />
            <View style={styles.streakCard}>
              <View style={styles.ringWrap}>
                <View style={styles.ringOuter}>
                  <View style={styles.ringInner}>
                    <Text style={styles.ringNum}>{streakInfo.streak}</Text>
                    <Text style={styles.ringUnit}>DAYS</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.streakHeadline}>You{'\u2019'}re on a {streakInfo.streak}-day streak</Text>
              <Text style={styles.streakSubline}>Keep it going{'\u2009\u00B7\u2009'}Your record is {streakInfo.record} days</Text>
              <View style={styles.weekRow}>
                {WEEK.map((d, i) => {
                  const on = streakInfo.week[i];
                  const today = i === streakInfo.todayIndex;
                  return (
                    <View key={i} style={styles.dayCol}>
                      <View style={[styles.dayCircle, on && styles.dayCircleOn, today && styles.dayCircleToday]}>
                        {on ? (
                          <Text style={styles.dayCheck}>{'\u2713'}</Text>
                        ) : (
                          <Text style={[styles.dayLetter, today && styles.dayLetterToday]}>{d}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.statGrid}>
              <Stat label="Articles read" value={String(reads.length)} />
              <Stat label="Sessions" value={String(bookings.length)} />
              <Stat label="Saved reads" value={String(savedIds.length)} />
              <Stat label="Worksheets" value={String(worksheetsDone.length)} />
            </View>
            <Text style={styles.sampleNote}>Saved, likes and sessions are live. The rest fills in once tracking is connected.</Text>

            <Pressable style={styles.progressCard} onPress={() => router.push('/progress')}>
              <View style={styles.progressIcon}>
                <Ionicons name="trending-up" size={20} color={COLORS.bg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.progressTitle}>Progress & achievements</Text>
                <Text style={styles.progressSub}>Your journey so far</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
            </Pressable>

            <View style={styles.accountWrap}>
              {role === 'admin' ? <Row label="Admin panel" onPress={() => router.push('/admin')} /> : null}
              {(role === 'expert' || role === 'admin') ? <Row label="Expert panel" onPress={() => router.push('/expert-panel')} /> : null}
              <Row label="Personal information" onPress={() => router.push('/personal-info')} />
              <Row label="Notifications" />
              <Row label="Help & support" />
              {loggedIn ? (
                <Row label="Sign out" onPress={async () => { await signOut(); router.push('/login'); }} />
              ) : (
                <Row label="Sign in" onPress={() => router.push('/login')} />
              )}
              <Row label="Debug (temporary)" onPress={() => router.push('/debug')} />
            </View>
          </View>
        ) : null}

        {view === 'Saved' ? (
          <View>
            <Text style={styles.sectionTitle}>Saved reads</Text>
            {saved.length === 0 ? (
              <Empty text="Nothing saved yet. Tap the bookmark on any article to keep it here." />
            ) : (
              saved.map((a) => <SavedRow key={a.id} a={a} onPress={() => router.push(`/article/${a.id}`)} />)
            )}

            <Text style={[styles.sectionTitle, { marginTop: 26 }]}>Liked</Text>
            {liked.length === 0 ? (
              <Empty text="Nothing liked yet. Tap the heart on any article." />
            ) : (
              liked.map((a) => <SavedRow key={a.id} a={a} onPress={() => router.push(`/article/${a.id}`)} />)
            )}
          </View>
        ) : null}

        {view === 'Bookings' ? (
          <View>
            <Text style={styles.sectionTitle}>Upcoming sessions</Text>
            {bookings.length === 0 ? (
              <Empty text="No upcoming sessions yet." />
            ) : (
              bookings.map((b) => <BookingRow key={b.refId} b={b} onPress={() => router.push(b.kind === 'program' ? `/program/${b.refId}` : `/class/${b.refId}`)} />)
            )}
            <Pressable style={styles.cta} onPress={() => router.navigate('/sessions')}>
              <Text style={styles.ctaText}>Browse sessions</Text>
            </Pressable>

            <Text style={[styles.sectionTitle, { marginTop: 26 }]}>Past sessions</Text>
            <Empty text="Your completed sessions will appear here." />
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={notifOpen} transparent animationType="slide" onRequestClose={() => setNotifOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setNotifOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Notifications</Text>
            {NOTIFICATIONS.map((n, i) => (
              <View key={i} style={styles.notifRow}>
                <View style={styles.notifIcon}>
                  <Ionicons name={n.icon as any} size={18} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                </View>
                <Text style={styles.notifTime}>{n.time}</Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SavedRow({ a, onPress }: { a: { id: string; title: string; category: string }; onPress: () => void }) {
  return (
    <Pressable style={styles.savedRow} onPress={onPress}>
      <Text style={styles.savedCat}>{a.category.toUpperCase()}</Text>
      <Text style={styles.savedTitle}>{a.title}</Text>
    </Pressable>
  );
}

function MoodInsightCard() {
  const router = useRouter();
  const { ready, mood, recoKind } = useMoodInsight(3, 14);
  const { articles } = useArticles();
  if (!ready || !mood) return null;
  const r = MOOD_RECO[mood];
  const moodLabel = (MOODS.find((m) => m.key === mood)?.label ?? mood).toLowerCase();

  let reco: { lead: string; title: string; subtitle: string; onPress: () => void } | null = null;
  if (recoKind === 'expert') {
    const e = EXPERTS.find((x) => x.id === r.expertId);
    if (e) reco = { lead: 'An expert who could help', title: e.name, subtitle: e.title, onPress: () => router.push(`/expert/${e.id}`) };
  } else if (recoKind === 'sound') {
    const sd = SOUNDS.find((x) => x.id === r.soundId);
    if (sd) reco = { lead: 'A sound to settle into', title: sd.title, subtitle: sd.purpose, onPress: () => router.push(`/sound/${sd.id}`) };
  } else {
    const a = pickArticleForMood(mood, articles);
    if (a) reco = { lead: 'A read that might land', title: a.title, subtitle: `${a.readMinutes ?? 5} min read`, onPress: () => router.push(`/article/${a.id}`) };
  }
  if (!reco) {
    const e = EXPERTS.find((x) => x.id === r.expertId);
    if (e) reco = { lead: 'An expert who could help', title: e.name, subtitle: e.title, onPress: () => router.push(`/expert/${e.id}`) };
  }

  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightEyebrow}>A GENTLE NOTE</Text>
      <Text style={styles.insightText}>We{'\u2019'}ve noticed you{'\u2019'}ve been feeling {moodLabel} lately.</Text>
      {reco ? (
        <Pressable style={styles.insightReco} onPress={reco.onPress}>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightRecoLead}>{reco.lead}</Text>
            <Text style={styles.insightRecoTitle} numberOfLines={2}>{reco.title}</Text>
            <Text style={styles.insightRecoSub} numberOfLines={1}>{reco.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function BookingRow({ b, onPress }: { b: Booking; onPress: () => void }) {
  return (
    <Pressable style={styles.bookingRow} onPress={onPress}>
      <View style={styles.bookingIcon}>
        <Ionicons name="videocam" size={16} color={COLORS.bg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bookingTitle}>{b.title}</Text>
        <Text style={styles.bookingMeta}>{b.when}</Text>
        <Text style={styles.bookingMeta}>with {b.expert}</Text>
        {b.link ? (
          <Pressable onPress={() => Linking.openURL(b.link!)} hitSlop={6} style={{ marginTop: 6 }}>
            <Text style={styles.bookingLink}>Open join link</Text>
          </Pressable>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : <Text style={styles.rowChevron}>{'\u203A'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  insightCard: { backgroundColor: COLORS.accentSoft, borderRadius: 20, padding: 18, marginBottom: 16 },
  insightEyebrow: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 },
  insightText: { fontFamily: FONT_SERIF, fontSize: 19, lineHeight: 26, color: COLORS.ink, marginBottom: 14 },
  insightReco: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14 },
  insightRecoLead: { fontSize: 11, letterSpacing: 0.5, color: COLORS.muted, marginBottom: 4 },
  insightRecoTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  insightRecoSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  topTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 48 },
  profile: { alignItems: 'center', paddingVertical: 12 },
  avatarWrap: { marginBottom: 14 },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.accent },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bg },
  name: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink },
  handle: { fontSize: 14, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  roleBadge: { marginTop: 10, backgroundColor: COLORS.ink, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  roleText: { fontSize: 11, letterSpacing: 1.5, color: COLORS.bg },
  signInBtn: { marginTop: 14, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: COLORS.accent },
  signInText: { color: COLORS.bg, fontSize: 14, letterSpacing: 0.5 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.accentSoft, borderRadius: 999, padding: 4, marginTop: 8, marginBottom: 22 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segItemOn: { backgroundColor: COLORS.ink },
  segText: { fontSize: 14, color: COLORS.ink },
  segTextOn: { color: COLORS.bg },
  streakCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 16 },
  streakTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  streakBadge: { width: 54, height: 54, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  streakNum: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.bg },
  streakLabel: { fontSize: 13, letterSpacing: 1.5, color: COLORS.muted },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ringWrap: { alignItems: 'center', marginBottom: 16 },
  ringOuter: { width: 156, height: 156, borderRadius: 78, borderWidth: 12, borderColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 112, height: 112, borderRadius: 56, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  ringNum: { fontFamily: FONT_SERIF, fontSize: 50, lineHeight: 54, color: COLORS.bg },
  ringUnit: { fontSize: 11, letterSpacing: 3, color: COLORS.bg, opacity: 0.85, marginTop: 2 },
  streakHeadline: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, textAlign: 'center' },
  streakSubline: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  dayCol: { alignItems: 'center', flex: 1 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  dayCircleOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dayCircleToday: { borderColor: COLORS.accent, borderWidth: 2 },
  dayCheck: { color: COLORS.bg, fontSize: 15 },
  dayLetter: { fontSize: 13, color: COLORS.muted },
  dayLetterToday: { color: COLORS.accent, fontWeight: '600' },
  dot: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dotText: { fontSize: 13, color: COLORS.muted },
  dotTextOn: { color: COLORS.bg },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 12, alignItems: 'center' },
  statValue: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink },
  statLabel: { fontSize: 12, letterSpacing: 0.5, color: COLORS.muted, marginTop: 6, textAlign: 'center' },
  sampleNote: { fontSize: 12, color: COLORS.muted, marginTop: 2, marginBottom: 22 },
  progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 28 },
  progressIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  progressTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  progressSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink },
  seeAll: { fontSize: 14, color: COLORS.accent },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  badgeMini: { alignItems: 'center' },
  badgeCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badgeLocked: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  accountWrap: { marginTop: 4 },
  savedRow: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 10 },
  savedCat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 6 },
  savedTitle: { fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 22, color: COLORS.ink },
  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 10 },
  bookingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bookingTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  bookingMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  bookingLink: { fontSize: 13, color: COLORS.accent },
  empty: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginTop: 10 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  cta: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, backgroundColor: COLORS.accent },
  ctaText: { color: COLORS.bg, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8 },
  rowLabel: { fontSize: 15, color: COLORS.ink },
  rowValue: { fontSize: 14, color: COLORS.muted },
  rowChevron: { fontSize: 18, color: COLORS.muted },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, maxHeight: '85%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 16 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.line },
  notifIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  notifTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  notifBody: { fontSize: 13, lineHeight: 19, color: COLORS.muted, marginTop: 3 },
  notifTime: { fontSize: 12, color: COLORS.muted, marginLeft: 8 },
});
