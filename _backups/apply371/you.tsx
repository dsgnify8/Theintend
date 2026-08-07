import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Linking } from 'react-native';
import { Image } from '@/components/Img';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMoodInsight, pickArticleForMood } from '@/lib/mood';
import { MOOD_RECO } from '@/constants/mood';
import { EXPERTS } from '@/constants/experts';
import { SOUNDS } from '@/constants/sounds';
import { LIBRARY } from '@/constants/library';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_ITALIC, FONT_SANS, FONT_SERIF } from '@/constants/brand';
import { useArticles } from '@/lib/articles';
import { type Booking, useBookPct, useBookings, useLastRead, useLiked, useProgress, useReadStreak, useReads, useSaved, useUpcomingBookings, useWorksheetsDone } from '@/lib/store';
import { useAllJournalEntries } from '@/lib/journal';
import { canChangeTime, getBookingById, needsNewTime, useHydrateBookings, useMyBookings } from '@/lib/bookings';
import { useMyPackages } from '@/lib/packages';
import { formatWhenLocal } from '@/lib/bookings';
import { useNotificationFeed } from '@/lib/notificationsFeed';
import { refreshProfile, signOut, updateProfile, useAuth } from '@/lib/auth';
import { noteKey, saveSessionNote, useSessionNotes } from '@/lib/sessionNotes';
import { uploadAvatar } from '@/lib/upload';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TINT = '#F1E9DE';

// Warm at the top, clearing towards the foot of the card.
const RESUME_WASH = ['rgba(107,97,87,0.15)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];
// Behind both sheets, so they are not a flat panel.
const SHEET_WASH = ['rgba(107,97,87,0.15)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

const YOU_SKY = require('@/assets/images/you-sky.jpg');
// A light image under dark type, so no scrim is needed. Only the fade.
const YOU_FADE = ['rgba(247,242,234,0.34)', 'rgba(247,242,234,0.18)', 'rgba(247,242,234,0.9)', '#F7F2EA'];
const YOU_STOPS = [0, 0.55, 0.9, 1];
const DEMO_STREAK = { streak: 4, record: 5, week: [true, true, true, true, false, false, false], todayIndex: 3 };
const DEMO_STATS = { reads: '12', sessions: '3', journals: '8', worksheets: '5' };
const FADE_BANDS = [0.015, 0.03, 0.05, 0.075, 0.105, 0.14, 0.18, 0.225, 0.27, 0.32];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function whenTime(w: string): number | null {
  const m = (w || '').match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return null;
  const mon = MON.indexOf(m[2]);
  if (mon < 0) return null;
  let hr = parseInt(m[4], 10) % 12;
  if (m[6] === 'PM') hr += 12;
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), hr, parseInt(m[5], 10)).getTime();
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

function pretty(id: string) {
  const s = id.replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, role } = useAuth();
  const [, setFocusTick] = useState(0);
  useFocusEffect(useCallback(() => {
    setFocusTick((t) => t + 1);
    refreshProfile();
  }, []));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [likedCat, setLikedCat] = useState('All');
  const [sesTab, setSesTab] = useState<'upcoming' | 'past'>('upcoming');
  const [savTab, setSavTab] = useState<'saved' | 'liked'>('saved');
  const [notifsOpen, setNotifsOpen] = useState(false);
  const notifs = useNotificationFeed();
  const openNotifs = () => { notifs.reload(); setNotifsOpen(true); notifs.markAllSeen(); };

  // Read fresh rather than from the device copy: service_id is not mirrored,
  // and the twelve hour check should be made against the real time.
  const changeTime = async (b: Booking) => {
    if (!b.id) {
      Alert.alert('We will move this for you', 'This booking was made before times could be changed here. Message us and we will sort it.');
      return;
    }
    const row: any = await getBookingById(b.id);
    if (!row) {
      Alert.alert('We could not open that', 'Try again in a moment.');
      return;
    }
    const check = canChangeTime(row);
    if (!check.allowed) {
      Alert.alert('This one needs us', check.reason);
      return;
    }
    const go = () => router.push({
      pathname: `/book/${row.expert_id ?? b.expertId ?? b.refId}`,
      params: { service: row.service_id ?? '', reschedule: String(b.id) },
    });
    if (check.confirmNeeded) {
      Alert.alert(
        'This one is soon',
        `Your session is in about ${check.hoursAway} hours. Would you still like to move it?`,
        [
          { text: 'Leave it', style: 'cancel' },
          { text: 'Choose a new time', onPress: go },
        ],
      );
      return;
    }
    go();
  };
  const [uploading, setUploading] = useState(false);

  const bookPcts = useBookPct();
  const savedIds = useSaved();
  const likedIds = useLiked();
  const reads = useReads();
  const journalEntries = useAllJournalEntries();
  const worksheetsDone = useWorksheetsDone();
  const streakLive = useReadStreak();
  const bookings = useBookings();
  const upcoming = useUpcomingBookings();
  const lastRead = useLastRead();
  const { map: progressMap, lastReadId } = useProgress();
  useHydrateBookings();
  const { articles } = useArticles();

  const loggedIn = !!session;
  const demo = !loggedIn;
  const streakInfo = demo ? DEMO_STREAK : streakLive;

  const libRoute = (l: any) => (l.pdf || l.html ? `/ebook/${l.id}` : `/title/${l.id}`);
  const saved = [
    ...articles.filter((a) => savedIds.includes(a.id)).map((a) => ({ id: a.id, title: a.title, category: a.category, image: a.image ?? null, route: `/article/${a.id}` })),
    ...LIBRARY.filter((l) => savedIds.includes(l.id)).map((l) => ({ id: l.id, title: l.title, category: l.type, image: (l as any).cover ?? null, route: libRoute(l) })),
  ];
  const liked = [
    ...articles.filter((a) => likedIds.includes(a.id)).map((a) => ({ id: a.id, title: a.title, category: a.category, image: a.image ?? null, type: 'Articles', route: `/article/${a.id}` })),
    ...LIBRARY.filter((l) => likedIds.includes(l.id)).map((l) => ({ id: l.id, title: l.title, category: l.type, image: (l as any).cover ?? null, type: 'E-books', route: libRoute(l) })),
    ...SOUNDS.filter((sd) => likedIds.includes(sd.id)).map((sd) => ({ id: sd.id, title: sd.title, category: sd.category, image: sd.cover ?? null, type: 'Sounds', route: `/sound/${sd.id}` })),
    ...EXPERTS.filter((e) => likedIds.includes(e.id)).map((e) => ({ id: e.id, title: e.name, category: 'Expert', image: (e as any).photo ?? null, type: 'Experts', route: `/expert/${e.id}` })),
  ];
  const LIKED_TYPES = ['Articles', 'Sounds', 'Experts', 'E-books'];
  const likedCats = ['All', ...LIKED_TYPES.filter((t) => liked.some((it) => it.type === t))];
  const effectiveLikedCat = likedCats.includes(likedCat) ? likedCat : 'All';
  const shownLiked = effectiveLikedCat === 'All' ? liked : liked.filter((it) => it.type === effectiveLikedCat);

  // Anything worth carrying on with. Only what genuinely exists.
  const resume = useMemo(() => {
    const out: { key: string; kind: string; title: string; meta: string; route: string; image?: any; pct?: number }[] = [];
    const art = lastReadId ? articles.find((a) => a.id === lastReadId) : undefined;
    if (art) {
      const pct = Math.round((progressMap[art.id] ?? 0) * 100);
      out.push({ key: 'art', kind: 'READING', title: art.title, meta: pct > 0 ? `${pct}% read` : `${art.readMinutes ?? 5} min read`, route: `/article/${art.id}`, image: art.image ?? null, pct: pct / 100 });
    }
    if (lastRead) {
      const item = LIBRARY.find((l) => l.id === lastRead.id);
      const bp = Math.round((bookPcts[lastRead.id] ?? 0) * 100);
      out.push({ key: 'book', kind: 'E-BOOK', title: lastRead.title, meta: bp > 0 ? `${bp}% through` : 'Pick up where you stopped', route: item ? libRoute(item) : `/title/${lastRead.id}`, image: item ? (item as any).cover ?? null : null, pct: bp / 100 });
    }
    const j = journalEntries[0];
    if (j) {
      out.push({ key: 'journal', kind: 'JOURNAL', title: pretty(j.categoryId), meta: `Last written ${shortDate(j.updatedAt || j.createdAt)}`, route: `/journaling/${j.categoryId}` });
    }
    return out;
  }, [articles, lastReadId, progressMap, lastRead, journalEntries, bookPcts]);

  const past = useMemo(() => {
    const now = Date.now();
    return bookings
      .map((b) => ({ b, t: whenTime(b.when) }))
      .filter((x) => x.t != null && (x.t as number) < now - 3600000)
      .sort((a, c) => (c.t as number) - (a.t as number))
      .map((x) => x.b);
  }, [bookings]);

  const displayName = loggedIn ? (profile?.full_name || 'You') : 'Your name';
  const initials = loggedIn && profile?.full_name ? profile.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('') : '\u00b7';

  const pickAndUpload = async () => {
    if (!loggedIn) { router.push('/login'); return; }
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

  const photoOptions = () => {
    if (!loggedIn) { router.push('/login'); return; }
    if (profile?.avatar_url) {
      Alert.alert('Profile photo', undefined, [
        { text: 'Choose new photo', onPress: pickAndUpload },
        { text: 'Remove photo', style: 'destructive', onPress: () => updateProfile({ avatar_url: null }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickAndUpload();
    }
  };

  const goSettings = (path: string) => {
    setSettingsOpen(false);
    setTimeout(() => router.push(path as any), 220);
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, demo && { paddingBottom: 280 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.youSkyBox}>
          <Image source={YOU_SKY} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={YOU_FADE} locations={YOU_STOPS} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[styles.band, { paddingTop: insets.top + 18 }]}>
          <View style={styles.topBar}>
            <Pressable style={styles.bell} onPress={openNotifs} hitSlop={10}>
              <Ionicons name="notifications-outline" size={21} color={COLORS.ink} />
              {notifs.ready && notifs.unread > 0 ? <View style={styles.bellDot} /> : null}
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.gear} onPress={() => setSettingsOpen(true)} hitSlop={10}>
              <Ionicons name="settings-outline" size={21} color={COLORS.ink} />
            </Pressable>
          </View>

          <View style={styles.profile}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                {uploading ? (
                  <View style={styles.uploadOverlay}><ActivityIndicator color={COLORS.bg} /></View>
                ) : null}
              </View>
              <Pressable style={styles.cameraBadge} onPress={photoOptions} hitSlop={8}>
                <Ionicons name="camera" size={13} color={COLORS.ink} />
              </Pressable>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.name} numberOfLines={2}>{displayName}</Text>
              {loggedIn ? <Text style={styles.handle} numberOfLines={1}>{profile?.email || 'Your space at The Intend'}</Text> : null}
              {loggedIn && role !== 'user' ? (
                <View style={styles.roleBadge}><Text style={styles.roleText}>{role.toUpperCase()}</Text></View>
              ) : null}
            </View>
          </View>

          <View style={styles.rhythmStrip}>
            <View style={styles.rhythmFigure}>
              <Text style={styles.rhythmNum}>{streakInfo.streak}</Text>
              <Text style={styles.rhythmUnit}>{streakInfo.streak === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rhythmLabel}>CURRENT STREAK</Text>
              <View style={styles.weekRow}>
                {WEEK.map((d, i) => {
                  const on = streakInfo.week[i];
                  const today = i === streakInfo.todayIndex;
                  return (
                    <View key={i} style={styles.dayCol}>
                      <View style={[styles.dayCircle, on && styles.dayCircleOn, today && styles.dayCircleToday]}>
                        {on ? <Text style={styles.dayCheck}>{'\u2713'}</Text> : <Text style={[styles.dayLetter, today && styles.dayLetterToday]}>{d}</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <MoodInsightCard />
        </View>
        </View>

        <View style={styles.band}>
          <Text style={styles.sectionLabel}>YOUR SESSIONS</Text>
          <PackagesBlock />

          <View style={styles.segRow}>
            <Pressable style={[styles.seg, sesTab === 'upcoming' && styles.segOn]} onPress={() => setSesTab('upcoming')}>
              <Text style={[styles.segText, sesTab === 'upcoming' && styles.segTextOn]}>Upcoming</Text>
            </Pressable>
            <Pressable style={[styles.seg, sesTab === 'past' && styles.segOn]} onPress={() => setSesTab('past')}>
              <Text style={[styles.segText, sesTab === 'past' && styles.segTextOn]}>Past</Text>
            </Pressable>
          </View>

          {sesTab === 'upcoming' ? (
            <>
              {upcoming.length === 0 ? (
                <Empty text="No upcoming sessions yet." />
              ) : (
                upcoming.map((b) => (
                  <BookingRow
                    key={`${b.refId}-${b.when}`}
                    b={b}
                    onPress={() => router.push({ pathname: '/booking-info', params: { title: b.title, when: b.when, expert: b.expert ?? '', link: b.link ?? '' } })}
                    onChange={() => changeTime(b)}
                  />
                ))
              )}
              <Pressable style={styles.cta} onPress={() => router.navigate('/sessions')}>
                <Text style={styles.ctaText}>Browse sessions</Text>
              </Pressable>
            </>
          ) : (
            past.length === 0 ? (
              <Empty text="Your completed sessions will appear here." />
            ) : (
              past.map((b) => <PastRow key={`${b.refId}-${b.when}`} b={b} />)
            )
          )}
        </View>

        {resume.length ? (
          <View style={[styles.band, styles.bandTint]}>
            <Text style={styles.sectionLabel}>PICK UP WHERE YOU LEFT OFF</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {resume.map((r) => (
                <Pressable key={r.key} style={styles.resumeCard} onPress={() => router.push(r.route as any)}>
                  <LinearGradient colors={RESUME_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <Text style={styles.resumeKind}>{r.kind}</Text>
                  <Text style={styles.resumeTitle} numberOfLines={3}>{r.title}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={styles.resumeTrack}>
                    <View style={[styles.resumeTrackFill, { width: `${Math.max(2, Math.min(100, Math.round((r.pct ?? 0) * 100)))}%` }]} />
                  </View>
                  <Text style={styles.resumeMeta}>{r.meta}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.band}>
          <Text style={styles.sectionLabel}>MY COMPANION</Text>
          <Pressable style={styles.aiCard} onPress={() => router.push(loggedIn ? '/your-ai' : '/login')}>
            <View style={styles.aiIcon}><Ionicons name="sparkles" size={19} color={COLORS.bg} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>My Companion</Text>
              <Text style={styles.aiSub}>Think out loud. See what is really going on.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.bg} />
          </Pressable>
        </View>



        <View style={[styles.band, styles.bandTint]}>
          <Text style={styles.sectionLabel}>YOUR JOURNAL</Text>
          {journalEntries.length === 0 ? (
            <Empty text="Nothing written yet. Your entries will collect here." />
          ) : (
            journalEntries.slice(0, 4).map((e) => {
              const first = e.items.find((it) => (it.answer ?? '').trim().length > 0);
              return (
                <Pressable key={e.id} style={styles.journalRow} onPress={() => router.push(`/journaling/${e.categoryId}` as any)}>
                  <View style={styles.journalDate}>
                    <Text style={styles.journalDateText}>{shortDate(e.updatedAt || e.createdAt)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.journalCat}>{pretty(e.categoryId)}</Text>
                    {first ? <Text style={styles.journalSnip} numberOfLines={2}>{first.answer}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                </Pressable>
              );
            })
          )}
          <Pressable style={styles.cta} onPress={() => router.push('/journaling')}>
            <Text style={styles.ctaText}>Open journal</Text>
          </Pressable>
        </View>

        <View style={styles.band}>
          <Text style={styles.sectionLabel}>SAVED AND LIKED</Text>
          <View style={styles.pillRow}>
            <Pressable style={[styles.pill, savTab === 'saved' && styles.pillOn]} onPress={() => setSavTab('saved')}>
              <Ionicons name="bookmark-outline" size={14} color={savTab === 'saved' ? COLORS.bg : COLORS.muted} />
              <Text style={[styles.pillText, savTab === 'saved' && styles.pillTextOn]}>Saved</Text>
            </Pressable>
            <Pressable style={[styles.pill, savTab === 'liked' && styles.pillOn]} onPress={() => setSavTab('liked')}>
              <Ionicons name="heart-outline" size={14} color={savTab === 'liked' ? COLORS.bg : COLORS.muted} />
              <Text style={[styles.pillText, savTab === 'liked' && styles.pillTextOn]}>Liked</Text>
            </Pressable>
          </View>

          {savTab === 'saved' ? (
            saved.length === 0 ? (
              <Empty text="Nothing saved yet. Tap the bookmark on any article or e-book." />
            ) : (
              saved.map((it) => <SavedRow key={it.id} a={it} onPress={() => router.push(it.route as any)} />)
            )
          ) : (
            liked.length === 0 ? (
              <Empty text="Nothing liked yet. Tap the heart on anything you want to keep." />
            ) : (
              <>
                {likedCats.length > 2 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.likedTabs}>
                    {likedCats.map((c) => {
                      const on = effectiveLikedCat === c;
                      return (
                        <Pressable key={c} onPress={() => setLikedCat(c)} style={[styles.likedTab, on && styles.likedTabOn]}>
                          <Text style={[styles.likedTabText, on && styles.likedTabTextOn]}>{c}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
                {shownLiked.map((it) => <SavedRow key={it.id} a={it} onPress={() => router.push(it.route as any)} />)}
              </>
            )
          )}
        </View>
        <View style={[styles.band, styles.bandTint]}>
          <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>
          <View style={styles.countRow}>
            <Count label="Read" value={demo ? DEMO_STATS.reads : String(reads.length)} />
            <View style={styles.countDiv} />
            <Count label="Sessions" value={demo ? DEMO_STATS.sessions : String(bookings.length)} />
            <View style={styles.countDiv} />
            <Count label="Journals" value={demo ? DEMO_STATS.journals : String(journalEntries.length)} />
            <View style={styles.countDiv} />
            <Count label="Workbooks" value={demo ? DEMO_STATS.worksheets : String(worksheetsDone.length)} />
          </View>
          <Pressable style={styles.progressCard} onPress={() => router.push('/progress')}>
            <View style={styles.progressIcon}><Ionicons name="trending-up" size={20} color={COLORS.bg} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Progress & achievements</Text>
              <Text style={styles.progressSub}>Your journey so far</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        </View>

      </ScrollView>

      {demo ? (
        <View style={styles.lockOverlay} pointerEvents="box-none">
          <View style={styles.lockFade} pointerEvents="none">
            {FADE_BANDS.map((o, i) => <View key={i} style={[styles.lockFadeBand, { opacity: o }]} />)}
          </View>
          <View style={styles.lockCard}>
            <Text style={styles.lockTitle}>Your profile</Text>
            <Text style={styles.lockText}>Sign in or create an account to view your profile, see your bookings and track your progress.</Text>
            <Pressable style={styles.lockBtn} onPress={() => router.push('/login')}>
              <Text style={styles.lockBtnText}>Sign in or create account</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal visible={notifsOpen} transparent animationType="slide" onRequestClose={() => setNotifsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setNotifsOpen(false)} />
          <View style={styles.sheet}>
            <LinearGradient colors={SHEET_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Notifications</Text>
            {notifs.items.length === 0 ? (
              <Text style={styles.notifEmpty}>Nothing right now. Upcoming sessions and packages waiting to be booked will show up here.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {notifs.items.map((n) => (
                  <Pressable
                    key={n.id}
                    style={styles.notifRow}
                    onPress={() => { setNotifsOpen(false); setTimeout(() => router.push(n.route as any), 220); }}
                  >
                    <View style={styles.notifIcon}>
                      <Ionicons name={n.icon as any} size={17} color={COLORS.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle} numberOfLines={2}>{n.title}</Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setSettingsOpen(false)} />
          <View style={styles.sheet}>
            <LinearGradient colors={SHEET_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Settings</Text>
            {loggedIn ? <SettingRow icon="person-outline" label="Personal information" onPress={() => goSettings('/personal-info')} /> : null}
            {role === 'admin' ? <SettingRow icon="grid-outline" label="Admin panel" onPress={() => goSettings('/admin')} /> : null}
            {role === 'expert' ? <SettingRow icon="briefcase-outline" label="Expert panel" onPress={() => goSettings('/expert-panel')} /> : null}
            <SettingRow icon="help-circle-outline" label="Help & support" onPress={() => goSettings('/help-support')} />
            <SettingRow icon="lock-closed-outline" label="Privacy" onPress={() => goSettings('/privacy')} />
            {loggedIn ? (
              <SettingRow
                icon="log-out-outline"
                label="Sign out"
                destructive
                onPress={async () => { setSettingsOpen(false); await signOut(); router.replace('/login'); }}
              />
            ) : (
              <SettingRow icon="log-in-outline" label="Sign in" onPress={() => goSettings('/login')} />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingRow({ icon, label, onPress, destructive }: { icon: any; label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable style={styles.setRow} onPress={onPress}>
      <Ionicons name={icon} size={19} color={destructive ? '#8F4A3B' : COLORS.ink} />
      <Text style={[styles.setLabel, destructive && { color: '#8F4A3B' }]}>{label}</Text>
      {destructive ? null : <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />}
    </Pressable>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function PackagesBlock() {
  const router = useRouter();
  const { items } = useMyPackages();
  const { items: dbBookings } = useMyBookings();
  const active = items.filter((p) => p.total - p.used > 0);
  if (active.length === 0) return null;
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={styles.h3}>Your packages</Text>
      {active.map((p) => {
        const remaining = Math.max(p.total - p.used, 0);
        const packageSessions = dbBookings
          .filter((b) => b.package_id === p.id)
          .sort((a, c) => (a.session_no ?? 0) - (c.session_no ?? 0));
        const nextNo = p.used + 1;
        return (
          <View key={p.id} style={styles.pkgCard}>
            <Text style={styles.pkgTitle}>{p.title}</Text>
            <View style={styles.pkgDots}>
              {Array.from({ length: p.total }).map((_, i) => (
                <View key={i} style={[styles.pkgDot, i < p.used ? styles.pkgDotUsed : styles.pkgDotOpen]} />
              ))}
            </View>
            <Text style={styles.pkgCount}>{remaining} of {p.total} sessions remaining</Text>

            {packageSessions.length ? (
              <View style={styles.pkgList}>
                {packageSessions.map((b) => (
                  <View key={b.id} style={styles.pkgSession}>
                    <View style={styles.pkgNo}>
                      <Text style={styles.pkgNoText}>{b.session_no ?? '\u00B7'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pkgWhen}>{formatWhenLocal(b)}</Text>
                      {b.link && /^https?:\/\//i.test(b.link) ? (
                        <Pressable onPress={() => Linking.openURL(b.link!)} hitSlop={6}>
                          <Text style={styles.pkgJoin}>Open join link</Text>
                        </Pressable>
                      ) : b.link ? (
                        <Text style={styles.pkgWaiting}>Location: {b.link}</Text>
                      ) : (
                        <Text style={styles.pkgWaiting}>Waiting for the link from your expert</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable style={styles.pkgBtn} onPress={() => router.push(`/book/${p.expert_id}?service=${p.service_id}&pkg=${p.id}`)}>
              <Text style={styles.pkgBtnText}>Choose a date for session {nextNo} of {p.total}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function SavedRow({ a, onPress }: { a: { id: string; title: string; category: string; image?: any }; onPress: () => void }) {
  // An article or expert photo arrives as a URL string. A library cover arrives
  // as a bundled module. Anything without artwork keeps the plain card.
  const src = typeof a.image === 'string' ? { uri: a.image } : a.image;
  if (!src) {
    return (
      <Pressable style={styles.savedRow} onPress={onPress}>
        <Text style={styles.savedCat}>{a.category.toUpperCase()}</Text>
        <Text style={styles.savedTitle}>{a.title}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable style={[styles.savedRow, styles.savedRowWithThumb]} onPress={onPress}>
      <Image source={src} style={styles.savedThumb} resizeMode="cover" />
      <View style={styles.savedRowBody}>
        <Text style={styles.savedCat}>{a.category.toUpperCase()}</Text>
        <Text style={styles.savedTitle} numberOfLines={2}>{a.title}</Text>
      </View>
    </Pressable>
  );
}

function MoodInsightCard() {
  const router = useRouter();
  const { ready, level, keyword, recoKind } = useMoodInsight(2, 14);
  const { articles } = useArticles();
  if (!ready || !level) return null;
  const r = MOOD_RECO[level];
  if (!r) return null;
  const moodLabel = (keyword ?? level).toLowerCase();

  let reco: { lead: string; title: string; subtitle: string; onPress: () => void } | null = null;
  if (recoKind === 'expert') {
    const e = EXPERTS.find((x) => x.id === r.expertId);
    if (e) reco = { lead: 'An expert who could help', title: e.name, subtitle: e.title, onPress: () => router.push(`/expert/${e.id}`) };
  } else if (recoKind === 'sound') {
    const sd = SOUNDS.find((x) => x.id === r.soundId);
    if (sd) reco = { lead: 'A sound to settle into', title: sd.title, subtitle: sd.purpose, onPress: () => router.push(`/sound/${sd.id}`) };
  } else {
    const a = pickArticleForMood(level, articles);
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

function BookingRow({ b, onPress, onChange }: { b: Booking; onPress: () => void; onChange?: () => void }) {
  return (
    <Pressable style={styles.bookingRow} onPress={onPress}>
      <View style={styles.bookingIcon}><Ionicons name="videocam" size={16} color={COLORS.bg} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bookingTitle}>{b.title}</Text>
        {needsNewTime(b) ? (
          <Text style={styles.bookingMoved}>Your expert had to move this. Choose a new time that suits you.</Text>
        ) : (
          <Text style={styles.bookingMeta}>{b.when}</Text>
        )}
        <Text style={styles.bookingMeta}>with {b.expert}</Text>
        {b.link ? (
          /^https?:\/\//i.test(b.link) ? (
            <Pressable onPress={() => Linking.openURL(b.link!)} hitSlop={6} style={{ marginTop: 6 }}>
              <Text style={styles.bookingLink}>Open join link</Text>
            </Pressable>
          ) : (
            <Text style={[styles.bookingMeta, { marginTop: 6 }]}>Location: {b.link}</Text>
          )
        ) : null}
        {onChange ? (
          <Pressable onPress={onChange} hitSlop={8} style={styles.changeWrap}>
            <Text style={styles.changeLink}>{needsNewTime(b) ? 'Choose a new time' : 'Change time'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

function PastRow({ b }: { b: Booking }) {
  const router = useRouter();
  const notes = useSessionNotes();
  const key = noteKey(b.refId, b.when);
  const note = notes[key] ?? '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => { setDraft(note); setOpen(true); };
  const save = async () => {
    setSaving(true);
    const { error } = await saveSessionNote(key, draft.trim());
    setSaving(false);
    if (error) { Alert.alert('Could not save', error.message ?? 'Please try again.'); return; }
    setOpen(false);
  };

  return (
    <View style={styles.pastCard}>
      <View style={styles.pastHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pastTitle} numberOfLines={2}>{b.title}</Text>
          <Text style={styles.pastMeta}>{b.when}</Text>
          {b.expert ? <Text style={styles.pastMeta}>with {b.expert}</Text> : null}
        </View>
        {b.expertId ? (
          <Pressable style={styles.rebook} onPress={() => router.push(`/book/${b.expertId}`)} hitSlop={6}>
            <Text style={styles.rebookText}>Book again</Text>
          </Pressable>
        ) : null}
      </View>

      {note ? (
        <Pressable style={styles.noteBox} onPress={start}>
          <Text style={styles.noteLabel}>YOUR NOTE</Text>
          <Text style={styles.noteText}>{note}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.noteAdd} onPress={start} hitSlop={6}>
          <Ionicons name="create-outline" size={15} color={COLORS.ink} />
          <Text style={styles.noteAddText}>Add a note from this session</Text>
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <LinearGradient colors={SHEET_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Your note</Text>
            <Text style={styles.noteHint}>{b.title}</Text>
            <TextInput
              style={styles.noteInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="What came up, what you want to remember, what you are taking with you."
              placeholderTextColor={COLORS.muted}
              multiline
              autoFocus
            />
            <Pressable style={[styles.noteSave, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.noteSaveText}>Save note</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 60 },
  youSkyBox: { paddingBottom: 10, overflow: 'hidden' },
  band: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26 },
  bandTint: { backgroundColor: TINT },

  topBar: { flexDirection: 'row', alignItems: 'center' },
  gear: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  bell: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: '#C0453B', borderWidth: 1.5, borderColor: COLORS.bg },
  notifEmpty: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingVertical: 10, paddingBottom: 22 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', padding: 14, marginBottom: 8 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  notifBody: { fontFamily: FONT_SANS, fontSize: 13, lineHeight: 18, color: COLORS.muted, marginTop: 2 },

  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 26, paddingBottom: 18 },
  profileText: { flex: 1 },
  avatarWrap: {},
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.accent },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  name: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink },
  handle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  roleBadge: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: COLORS.ink, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  roleText: { fontSize: 11, letterSpacing: 1.5, color: COLORS.bg },

  sectionLabel: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginBottom: 14 },
  rhythmStrip: { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: 'rgba(255,255,255,0.34)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', paddingVertical: 16, paddingHorizontal: 18, marginTop: 20 },
  rhythmFigure: { alignItems: 'center', minWidth: 52 },
  rhythmNum: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 38, color: COLORS.ink },
  rhythmUnit: { fontFamily: FONT_ITALIC, fontSize: 15, color: COLORS.muted, marginTop: -2 },
  rhythmLabel: { fontSize: 9, letterSpacing: 2.2, color: COLORS.muted, marginBottom: 10 },
  h3: { fontFamily: FONT_SERIF, fontSize: 19, color: COLORS.ink, marginBottom: 10 },
  segRow: { flexDirection: 'row', backgroundColor: COLORS.accentSoft, borderRadius: 999, padding: 4, marginBottom: 16 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segOn: { backgroundColor: COLORS.ink },
  segText: { fontSize: 14, color: COLORS.ink },
  segTextOn: { color: COLORS.bg },
  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  pillOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  pillText: { fontSize: 14, color: COLORS.muted },
  pillTextOn: { color: COLORS.bg },

  insightCard: { backgroundColor: COLORS.accentSoft, borderRadius: 20, padding: 18 },
  insightEyebrow: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 },
  insightText: { fontFamily: FONT_SERIF, fontSize: 19, lineHeight: 26, color: COLORS.ink, marginBottom: 14 },
  insightReco: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14 },
  insightRecoLead: { fontSize: 11, letterSpacing: 0.5, color: COLORS.muted, marginBottom: 4 },
  insightRecoTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  insightRecoSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  strip: { gap: 12, paddingRight: 20 },
  resumeCard: { width: 206, height: 140, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', overflow: 'hidden', padding: 16 },
  resumeTrack: { height: 2, borderRadius: 1, backgroundColor: COLORS.line, overflow: 'hidden', marginBottom: 9 },
  resumeTrackFill: { height: 2, backgroundColor: COLORS.ink },
  resumeKind: { fontSize: 9, letterSpacing: 1.8, color: COLORS.accent, marginBottom: 8 },
  resumeTitle: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 22, color: COLORS.ink },
  resumeMeta: { fontSize: 12, color: COLORS.muted },

  aiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.ink, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 18 },
  aiIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(247,242,234,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  aiTitle: { fontFamily: FONT_SERIF, fontSize: 19, color: COLORS.bg },
  aiSub: { fontSize: 13, lineHeight: 18, color: COLORS.bg, opacity: 0.72, marginTop: 3 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  dayCircleOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dayCircleToday: { borderColor: COLORS.ink, borderWidth: 2 },
  dayCheck: { color: COLORS.bg, fontSize: 15 },
  dayLetter: { fontSize: 13, color: COLORS.ink, opacity: 0.6 },
  dayLetterToday: { color: COLORS.ink, fontWeight: '600' },

  countRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: COLORS.line },
  count: { flex: 1, alignItems: 'center' },
  countValue: { fontFamily: FONT_SERIF, fontSize: 21, color: COLORS.ink },
  countLabel: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  countDiv: { width: 1, height: 26, backgroundColor: COLORS.line },

  progressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 12 },
  progressIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  progressTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  progressSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  bookingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  bookingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bookingTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  bookingMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  bookingMoved: { fontSize: 12, lineHeight: 17, color: COLORS.accent, marginTop: 3 },
  changeWrap: { alignSelf: 'flex-start', marginTop: 8 },
  changeLink: { fontSize: 13, color: COLORS.ink, textDecorationLine: 'underline' },
  bookingLink: { fontSize: 13, color: COLORS.accent },

  pastCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  pastHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteBox: { backgroundColor: COLORS.accentSoft, borderRadius: 12, padding: 13, marginTop: 12 },
  noteLabel: { fontSize: 9, letterSpacing: 1.6, color: COLORS.accent, marginBottom: 5 },
  noteText: { fontSize: 14, lineHeight: 20, color: COLORS.ink },
  noteAdd: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  noteAddText: { fontSize: 13, color: COLORS.accent },
  noteHint: { fontSize: 13, color: COLORS.muted, marginBottom: 12 },
  noteInput: { minHeight: 140, maxHeight: 260, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, fontSize: 15, lineHeight: 22, color: COLORS.ink, textAlignVertical: 'top' },
  noteSave: { marginTop: 14, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  noteSaveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.4 },
  pastTitle: { fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 21, color: COLORS.ink },
  pastMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  rebook: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  rebookText: { fontSize: 12, color: COLORS.accent },

  journalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', padding: 14, marginBottom: 10 },
  journalDate: { width: 54, alignItems: 'center' },
  journalDateText: { fontFamily: FONT_SERIF, fontSize: 14, color: COLORS.accent },
  journalCat: { fontSize: 10, letterSpacing: 1.4, color: COLORS.muted, marginBottom: 4 },
  journalSnip: { fontSize: 14, lineHeight: 20, color: COLORS.ink },

  pkgCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 10 },
  pkgTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  pkgDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
  pkgDot: { flex: 1, height: 7, borderRadius: 4 },
  pkgDotUsed: { backgroundColor: COLORS.line },
  pkgDotOpen: { backgroundColor: COLORS.accent },
  pkgCount: { fontSize: 13, color: COLORS.ink, marginTop: 10 },
  pkgList: { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 4 },
  pkgSession: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  pkgNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  pkgNoText: { fontFamily: FONT_SERIF, fontSize: 13, color: COLORS.accent },
  pkgWhen: { fontSize: 14, color: COLORS.ink },
  pkgJoin: { fontSize: 13, color: COLORS.accent, marginTop: 3 },
  pkgWaiting: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  pkgBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  pkgBtnText: { color: COLORS.bg, fontSize: 14, letterSpacing: 0.5 },

  savedRow: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  savedRowWithThumb: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  savedThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORS.line },
  savedRowBody: { flex: 1 },
  savedCat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 6 },
  savedTitle: { fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 22, color: COLORS.ink },
  likedTabs: { gap: 8, paddingBottom: 14, paddingRight: 8 },
  likedTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  likedTabOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  likedTabText: { fontSize: 13, color: COLORS.muted },
  likedTabTextOn: { color: COLORS.bg },

  empty: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', padding: 18, marginBottom: 10 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  cta: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, backgroundColor: COLORS.ink },
  ctaText: { color: COLORS.bg, fontSize: 14 },

  lockOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 20 },
  lockFade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -170 },
  lockFadeBand: { flex: 1, backgroundColor: COLORS.ink },
  lockCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 24, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 24, paddingHorizontal: 22, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  lockTitle: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink, marginBottom: 8 },
  lockText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center', marginBottom: 18 },
  lockBtn: { backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 15, paddingHorizontal: 36 },
  lockBtnText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, overflow: 'hidden' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginBottom: 18, marginTop: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8 },
  setLabel: { flex: 1, fontFamily: FONT_SANS, fontSize: 15, color: COLORS.ink },
});
