import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail } from '@/lib/experts';
import { useMySubmissions } from '@/lib/submissions';
import { bookingStartMs, formatWhenForExpert, useExpertBookings } from '@/lib/bookings';
import { FramedImage } from '@/components/FramedImage';
import type { Expert } from '@/constants/experts';

const DAY_LABELS: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

function availabilitySummary(av: any): string | null {
  if (!av) return null;
  const on = Object.keys(DAY_LABELS).filter((k) => av[k]?.on);
  if (on.length === 0) return null;
  return on.map((k) => DAY_LABELS[k]).join(', ');
}
function isNew(createdAt: string) {
  const t = new Date(createdAt).getTime();
  return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
}

export default function ExpertPanel() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);

  useEffect(() => {
    if (user?.email) getExpertForEmail(user.email).then(setExpert);
    else setExpert(null);
  }, [user?.email]);

  const { items: bookings, loading: bookingsLoading } = useExpertBookings(expert?.id);
  const mySubs = useMySubmissions(expert?.id);

  if (role !== 'expert' && role !== 'admin') {
    return <Screen router={router}><View style={styles.center}><Text style={styles.muted}>This area is for experts.</Text></View></Screen>;
  }
  if (expert === undefined) {
    return <Screen router={router}><View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View></Screen>;
  }
  if (!expert) {
    return (
      <Screen router={router}>
        <View style={styles.notLinked}>
          <Ionicons name="link-outline" size={28} color={COLORS.muted} />
          <Text style={styles.notLinkedText}>Your expert profile isn't linked to this account yet. Ask the admin to add your email to your expert profile.</Text>
        </View>
      </Screen>
    );
  }

  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');
  const [tab, setTab] = useState<'up' | 'past'>('up');

  // Split on the actual time rather than on when the booking was made. It was
  // listing everything under Coming up, oldest first.
  const now = Date.now();
  const dated = bookings.map((b: any) => ({ b, at: bookingStartMs(b) }));
  const upcoming = dated
    .filter((x) => x.at == null || x.at >= now - 3600000)
    .sort((a, c) => (a.at ?? Infinity) - (c.at ?? Infinity))
    .map((x) => x.b);
  const past = dated
    .filter((x) => x.at != null && x.at < now - 3600000)
    .sort((a, c) => (c.at ?? 0) - (a.at ?? 0))
    .map((x) => x.b);
  const shown = tab === 'up' ? upcoming : past;

  const newCount = upcoming.filter((b: any) => isNew(b.created_at)).length;
  const availSummary = availabilitySummary(expert.availability);

  return (
    <Screen router={router}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Compact header */}
        <View style={styles.head}>
          <View style={styles.avatar}>
            {expert.photo ? (
              <FramedImage uri={expert.photo} scale={expert.photoScale ?? 1} x={expert.photoX ?? 0} y={expert.photoY ?? 0} radius={28} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{expert.name}</Text>
            <Text style={styles.title}>{expert.title.toUpperCase()}</Text>
          </View>
          <Pressable onPress={() => router.push(`/expert/${expert.id}`)} hitSlop={8}>
            <Ionicons name="open-outline" size={22} color={COLORS.muted} />
          </Pressable>
        </View>

        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>Your sessions</Text>
          {tab === 'up' && newCount > 0 ? <Text style={styles.newBadge}>{newCount} new</Text> : null}
        </View>

        <View style={styles.tabRow}>
          {(['up', 'past'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.sessionTab, tab === t && styles.sessionTabOn]}>
              <Text style={[styles.sessionTabText, tab === t && styles.sessionTabTextOn]}>
                {t === 'up' ? `Coming up${upcoming.length ? ` (${upcoming.length})` : ''}` : `Past${past.length ? ` (${past.length})` : ''}`}
              </Text>
            </Pressable>
          ))}
        </View>

        {bookingsLoading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={COLORS.accent} /></View>
        ) : shown.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              {tab === 'up'
                ? 'Nothing booked ahead. When someone books a session with you, it shows up here.'
                : 'Nothing has happened yet. Sessions move here once they are done.'}
            </Text>
          </View>
        ) : (
          shown.map((b: any) => (
            <Pressable key={b.id} style={styles.bookingRow} onPress={() => router.push(`/expert-booking/${b.id}`)}>
              <View style={styles.rowIcon}>
                <Ionicons name={b.kind === 'program' ? 'ribbon-outline' : b.kind === 'class' ? 'videocam-outline' : 'person-outline'} size={18} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.bookingTitleRow}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{b.title}</Text>
                  {tab === 'up' && isNew(b.created_at) ? <Text style={styles.newDot}>NEW</Text> : null}
                </View>
                <Text style={styles.rowMeta}>{formatWhenForExpert(b)}{b.booker_name ? ` · ${b.booker_name}` : ''}</Text>
                {tab === 'past' ? (
                  <Text style={b.payout_id ? styles.paidTag : styles.owedTag}>
                    {b.payout_id ? 'Paid' : 'Awaiting payout'}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </Pressable>
          ))
        )}

        <Text style={styles.groupLabel}>YOUR WORK</Text>
        <Pressable style={styles.row} onPress={() => router.push('/expert-availability')}>
          <View style={styles.rowIcon}><Ionicons name="time-outline" size={18} color={COLORS.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{availSummary ? 'Open: ' + availSummary : 'Set your available times'}</Text>
            <Text style={styles.rowMeta}>{availSummary ? 'The days and hours people can book you' : 'Choose the days and hours you take bookings'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
        <ActionRow
          icon="add-circle-outline"
          title="Propose an offering"
          meta="Submit a new session or program for approval"
          onPress={() => router.push('/expert-offer-new')}
        />

        <Text style={styles.groupLabel}>WHAT YOU HAVE SENT US</Text>
        {mySubs.items.length === 0 ? (
          <Text style={styles.emptyText}>Nothing submitted yet. Anything you propose shows here with where it got to.</Text>
        ) : (
          mySubs.items.slice(0, 8).map((sub: any) => (
            <View key={sub.id} style={styles.subRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {sub.payload?.title ?? (sub.kind === 'profile' ? 'Profile update' : 'Submission')}
                </Text>
                <Text style={styles.rowMeta}>
                  {sub.kind === 'service_edit' ? 'Change to a live offering'
                    : sub.kind === 'session' ? 'New session'
                    : sub.kind === 'program' ? 'New program'
                    : sub.kind === 'class' ? 'New class'
                    : 'Profile update'}
                </Text>
                {sub.status === 'rejected' && sub.review_note ? (
                  <Text style={styles.subNote}>{sub.review_note}</Text>
                ) : null}
              </View>
              <Text style={[
                styles.subState,
                sub.status === 'approved' ? styles.subLive : sub.status === 'rejected' ? styles.subNo : styles.subPending,
              ]}>
                {sub.status === 'approved' ? 'Live' : sub.status === 'rejected' ? 'Not yet' : 'With us'}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.groupLabel}>YOUR PROFILE</Text>
        <ActionRow
          icon="create-outline"
          title="Bio and photo"
          meta="Changes are reviewed before they go live"
          onPress={() => router.push('/expert-edit')}
        />
        <ActionRow
          icon="open-outline"
          title="View your public profile"
          meta="See exactly what a client sees"
          onPress={() => router.push(`/expert/${expert.id}`)}
        />

        <Text style={styles.groupLabel}>YOUR MONEY</Text>
        <ActionRow
          icon="cash-outline"
          title="Payouts"
          meta="What each booking pays you, and where it is sent"
          onPress={() => router.push('/expert-payouts')}
        />
      </ScrollView>
    </Screen>
  );
}

function Screen({ children, router }: { children: any; router: any }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>You</Text>
      </Pressable>
      {children}
    </SafeAreaView>
  );
}

function ActionRow({ icon, title, meta, onPress, targetRef, onLayout }: { icon: any; title: string; meta: string; onPress: () => void; targetRef?: any; onLayout?: (e: any) => void }) {
  return (
    <Pressable ref={targetRef} onLayout={onLayout} style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={COLORS.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  notLinked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40, paddingBottom: 60 },
  notLinkedText: { fontSize: 15, lineHeight: 22, color: COLORS.muted, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, marginTop: 4 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 26, marginBottom: 12 },
  groupLabel: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginTop: 30, marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  subState: { fontSize: 11, letterSpacing: 0.6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
  subPending: { color: COLORS.muted, backgroundColor: COLORS.accentSoft },
  subLive: { color: COLORS.bg, backgroundColor: COLORS.taupeBlue },
  subNo: { color: COLORS.bg, backgroundColor: '#8F4A3B' },
  subNote: { fontSize: 12, lineHeight: 18, color: COLORS.accent, marginTop: 5 },
  sessionTab: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  sessionTabOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  sessionTabText: { fontSize: 13, color: COLORS.ink },
  sessionTabTextOn: { color: COLORS.bg },
  paidTag: { fontSize: 11, color: COLORS.taupeBlue, marginTop: 4 },
  owedTag: { fontSize: 11, color: COLORS.accent, marginTop: 4 },
  newBadge: { fontSize: 12, color: COLORS.bg, backgroundColor: COLORS.accent, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden', marginTop: 26 },
  loadingBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 20, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center' },
  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  bookingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newDot: { fontSize: 9, letterSpacing: 1, color: COLORS.accent, backgroundColor: COLORS.accentSoft, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  rowMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
});
