import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useExpert } from '@/lib/experts';
import { getCalendarBusy, createCalendarEvent } from '@/lib/calendar';
import { applyNewTime, createBooking, getBookingById, setBookingCalendarEvent, useExpertBookings } from '@/lib/bookings';
import { createOrder, markOrderPaid, markOrderFulfilled, markOrderFailed } from '@/lib/orders';
import { sendPushToEmail } from '@/lib/notifications';
import { useService } from '@/lib/services';
import { payWithSheet, priceToMinorUnits } from '@/lib/payments';
import { TABBY_ENABLED } from '@/constants/stripe';
import { payWithTabby, priceToMajorString } from '@/lib/tabby';

// The same wash the library, admin and companion pages carry.
const PAGE_WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];
// Falls across a card rather than down the page, so it has depth without
// looking like a separate panel.
const CARD_WASH = ['rgba(107,97,87,0.10)', 'rgba(107,97,87,0.03)', 'rgba(107,97,87,0)'];
// Lighter at the top, so a dark button has some depth rather than being flat.
const INK_GRAD = [COLORS.inkLift, COLORS.ink];
import { TabbyLogo } from '@/components/TabbyLogo';
import { createPackage, consumePackageSession, getPackage } from '@/lib/packages';
import { useAuth } from '@/lib/auth';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const SESSION_TYPES = ['Online session', 'In person'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_AHEAD = 14;

function keyFor(y: number, m: number, d: number, h: number) { return `${y}-${m}-${d}-${h}`; }
function hourLabel(h: number) { const hh = ((h + 11) % 12) + 1; return `${hh}:00 ${h < 12 ? 'AM' : 'PM'}`; }
function tzName() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'; } catch { return 'local time'; } }
function tzId(): string | null { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } }

function normalizeSlots(day: any): number[] {
  if (!day) return [];
  if (Array.isArray(day.slots)) return day.slots;
  if (day.on === false) return [];
  const start = typeof day.start === 'number' ? day.start : 9;
  const end = typeof day.end === 'number' ? day.end : 17;
  const out: number[] = [];
  for (let h = start; h < end; h++) out.push(h);
  return out;
}

// Human-readable but deterministically parseable, e.g. "Mon, 6 Jul 2026, 2:00 PM"
function formatSlot(d: Date) {
  return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${hourLabel(d.getHours())}`;
}
function parseSlot(s: string): Date | null {
  const m = s.match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MON.indexOf(m[2]);
  const year = parseInt(m[3], 10);
  let hr = parseInt(m[4], 10) % 12;
  if (m[6] === 'PM') hr += 12;
  if (mon < 0) return null;
  return new Date(year, mon, day, hr, 0, 0, 0);
}

// One-line summary for the chosen offering shown at the top of the booking screen.
function svcHeaderMeta(s: any) {
  const parts: string[] = [];
  const loc = s.location ? ` (${s.location})` : '';
  const mode = s.online && s.inPerson ? `Online or in person${loc}` : s.online ? 'Online' : s.inPerson ? `In person${loc}` : 'Online';
  parts.push(mode);
  if (s.kind === 'package' && s.sessionsTotal) parts.push(`${s.sessionsTotal} sessions`);
  if (s.durationMin) parts.push(`${s.durationMin} min`);
  if (s.price) parts.push(/free/i.test(s.price) ? 'Free' : s.price);
  return parts.join(' \u00B7 ');
}

export default function BookScreen() {
  const router = useRouter();
  const { id, service: serviceId, pkg, reschedule } = useLocalSearchParams<{ id: string; service?: string; pkg?: string; reschedule?: string }>();
  // Moving a booking that already exists, rather than making one.
  const isReschedule = !!reschedule;
  const { expert, loading } = useExpert(String(id));
  const { service: svc } = useService(serviceId ? String(serviceId) : undefined);
  const { service: linkedPkg } = useService(svc?.packageId ? String(svc.packageId) : undefined);
  const isFree = !!svc && (svc.price ?? '').replace(/[^0-9]/g, '') === '';

  const requireAuth = () => {
    if (user) return true;
    Alert.alert(
      'Sign in to book',
      'Create an account or sign in to book with an expert.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in or sign up', onPress: () => router.push('/login') },
      ]
    );
    return false;
  };

  const askForPhone = (msg?: string) => {
    Alert.alert(
      'Add your number',
      msg || 'Add your phone number in Personal information to pay with Tabby.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Add number', onPress: () => router.push('/personal-info') },
      ]
    );
  };
  const { items: bookings } = useExpertBookings(String(id));
  const { user } = useAuth();

  const [type, setType] = useState(SESSION_TYPES[0]);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [requested, setRequested] = useState(false);
  const [chosenLabel, setChosenLabel] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pkgTotal, setPkgTotal] = useState<number | null>(null);
  const [wasRequest, setWasRequest] = useState(false);
  const [payChoiceOpen, setPayChoiceOpen] = useState(false);

  const isPackageContinue = !!pkg;
  const isPackagePurchase = !!svc && svc.kind === 'package' && !pkg;

  // Which session modes this offering allows. Online-only offerings show one option.
  const typeOptions = svc
    ? ([svc.online ? 'Online session' : null, svc.inPerson ? (svc.location ? `In person, ${svc.location}` : 'In person') : null].filter(Boolean) as string[])
    : SESSION_TYPES;

  // Keep the selected type valid for the loaded offering.
  useEffect(() => {
    if (typeOptions.length && !typeOptions.includes(type)) setType(typeOptions[0]);
  }, [svc?.id]);

  // Pull this expert's Google busy times for the booking window.
  useEffect(() => {
    if (!id) return;
    const now = new Date();
    const end = new Date(now); end.setDate(now.getDate() + DAYS_AHEAD + 1);
    getCalendarBusy(String(id), now.toISOString(), end.toISOString())
      .then((r) => {
        if (!r.connected) { setBusyKeys(new Set()); return; }
        const set = new Set<string>();
        for (const b of r.busy) {
          let t = new Date(b.start);
          const bend = new Date(b.end);
          let guard = 0;
          while (t < bend && guard < 800) {
            set.add(keyFor(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours()));
            t = new Date(t.getTime() + 3600000);
            guard++;
          }
        }
        setBusyKeys(set);
      })
      .catch(() => setBusyKeys(new Set()));
  }, [id]);

  // Slots already taken by existing bookings. starts_at is an absolute instant
  // so it compares correctly no matter which zone the booking was made in.
  // when_text is only used for rows written before starts_at existed.
  const takenKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      const iso = (b as any).starts_at;
      let d: Date | null = null;
      if (iso) {
        const abs = new Date(iso);
        if (!isNaN(abs.getTime())) d = abs;
      }
      if (!d) d = parseSlot(b.when_text || '');
      if (d) set.add(keyFor(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()));
    }
    return set;
  }, [bookings]);

  // Project the weekly availability onto real upcoming dates, dropping past,
  // busy and already-booked hours.
  const days = useMemo(() => {
    const avail: any = expert?.availability ?? {};
    const now = new Date();
    const out: { date: Date; hours: number[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0, 0, 0, 0);
      const slots = normalizeSlots(avail[WD_KEY[d.getDay()]]);
      const hours = slots.filter((h) => {
        const start = new Date(d); start.setHours(h, 0, 0, 0);
        if (start.getTime() <= now.getTime()) return false;
        const k = keyFor(d.getFullYear(), d.getMonth(), d.getDate(), h);
        return !busyKeys.has(k) && !takenKeys.has(k);
      });
      if (hours.length) out.push({ date: d, hours });
    }
    return out;
  }, [expert?.availability, busyKeys, takenKeys]);

  useEffect(() => { if (dayIdx >= days.length) { setDayIdx(0); setHour(null); } }, [days.length, dayIdx]);

  const bookingTitle = () => {
    if (svc && svc.kind === 'package') return `${svc.durationMin ?? 90} minute session with ${expert?.name ?? ''}`;
    return `${svc ? svc.name : type} with ${expert?.name ?? ''}`;
  };

  const finalizeBooking = async (orderId?: string | null) => {
    if (!expert || hour == null || !days[dayIdx]) return;
    const slot = new Date(days[dayIdx].date); slot.setHours(hour, 0, 0, 0);
    const label = formatSlot(slot);
    setSaving(true);

    // Already paid for, and the package session was already counted when this
    // was first booked. So this updates the row and touches nothing else.
    if (isReschedule) {
      const existing = await getBookingById(String(reschedule));
      const { error } = await applyNewTime(String(reschedule), {
        startsAt: slot,
        whenText: label,
        durationMin: svc?.durationMin ?? undefined,
        timezone: tzId(),
        by: 'client',
        previousCount: (existing as any)?.reschedule_count ?? 0,
      });
      if (!error && (expert as any)?.accountEmail) {
        sendPushToEmail(
          (expert as any).accountEmail,
          'A session has moved',
          `${bookingTitle()} is now ${label}. Please update the join link or the address if it needs changing.`,
        );
      }
      // No calendar call here. applyNewTime moves the event this booking
      // already has, and creating one as well would leave two at two times.
      setChosenLabel(label);
      setWasRequest(false);
      setRequested(true);
      setSaving(false);
      return;
    }

    // Package accounting: buying creates the package; continuing consumes one
    // credit. Either way we come out knowing which package this belongs to and
    // which session number it is, so the booking can be filed against it.
    let packageId: string | null = null;
    let sessionNo: number | null = null;
    let totalForTitle: number | null = null;

    if (isPackagePurchase && svc) {
      const total = svc.sessionsTotal ?? 5;
      const newId = await createPackage({
        expertId: String(id), serviceId: svc.id,
        title: svc.name + ' with ' + expert.name,
        expertName: expert.name, total,
      });
      if (newId) {
        const used = await consumePackageSession(newId);
        setPkgTotal(total); setRemaining(total - (used ?? 1));
        packageId = newId; sessionNo = used ?? 1; totalForTitle = total;
      }
    } else if (isPackageContinue && pkg) {
      const before = await getPackage(String(pkg));
      const used = await consumePackageSession(String(pkg));
      const total = before?.total ?? 5;
      setPkgTotal(total); setRemaining(Math.max(total - (used ?? total), 0));
      packageId = String(pkg); sessionNo = used ?? null; totalForTitle = total;
    }

    // The expert panel lists bookings by title, so the session number goes in it.
    const fullTitle = sessionNo && totalForTitle
      ? `${bookingTitle()} (session ${sessionNo} of ${totalForTitle})`
      : bookingTitle();

    const created = await createBooking({
      refId: String(id), kind: 'service',
      title: fullTitle,
      when: label, expert: expert.name, expertId: String(id),
      packageId, sessionNo,
      // Same instant that goes to Google Calendar below, so the two agree.
      startsAt: slot,
      durationMin: svc?.durationMin ?? null,
      timezone: tzId(),
      serviceId: svc?.id ? String(svc.id) : null,
    });
    if (orderId) {
      markOrderFulfilled(orderId, { bookingId: (created as any)?.id ?? null, packageId });
    }
    if ((expert as any)?.accountEmail) {
      sendPushToEmail((expert as any).accountEmail, 'New booking', `${fullTitle} was just booked.`);
    }
    const startIso = slot.toISOString();
    const endIso = new Date(slot.getTime() + (svc?.durationMin ? svc.durationMin : 60) * 60000).toISOString();
    createCalendarEvent({
      expertId: String(id),
      summary: `${bookingTitle()} \u00B7 The Intend`,
      description: 'Booked through The Intend.',
      startIso, endIso,
      attendeeEmail: user?.email ?? undefined,
    })
      .then((eventId) => {
        // Kept on the booking, so this event can be moved or removed later.
        const bid = (created as any)?.id;
        if (eventId && bid) setBookingCalendarEvent(String(bid), eventId);
      })
      .catch(() => {});
    setChosenLabel(label);
    setWasRequest(false);
    setRequested(true);
    setSaving(false);
  };

  // The time the customer picked, recorded on the order so a charge without a
  // booking can still be matched to what they were buying.
  const intendedSlot = () => {
    if (hour == null || !days[dayIdx]) return null;
    const d = new Date(days[dayIdx].date); d.setHours(hour, 0, 0, 0);
    return d;
  };

  const startPayment = async () => {
    if (!expert || hour == null || !days[dayIdx]) return;
    const amount = svc ? priceToMinorUnits(svc.price) : 0;
    if (amount <= 0) { finalizeBooking(); return; }
    const label = `${svc?.name ?? 'Session'} with ${expert.name}`;
    setSaving(true);
    const orderId = await createOrder({
      provider: 'stripe',
      amountMinor: amount,
      currency: 'aed',
      kind: isPackagePurchase ? 'package' : 'single',
      expertId: String(id),
      serviceId: svc?.id ? String(svc.id) : null,
      label,
      intendedStart: intendedSlot(),
      intendedTz: tzId(),
    });
    const res = await payWithSheet({ amount, label });
    setSaving(false);
    if (res.ok) {
      await markOrderPaid(orderId, res.paymentIntentId ?? null);
      finalizeBooking(orderId);
    } else {
      await markOrderFailed(orderId, res.error ?? 'unknown');
      if (res.error && res.error !== 'canceled') { Alert.alert('Payment', res.error); }
    }
  };

  const startTabby = async () => {
    if (!expert || hour == null || !days[dayIdx] || !svc) return;
    const label = `${svc.name} with ${expert.name}`;
    setSaving(true);
    const orderId = await createOrder({
      provider: 'tabby',
      amountMinor: priceToMinorUnits(svc.price),
      currency: 'aed',
      kind: isPackagePurchase ? 'package' : 'single',
      expertId: String(id),
      serviceId: svc?.id ? String(svc.id) : null,
      label,
      intendedStart: intendedSlot(),
      intendedTz: tzId(),
    });
    const res = await payWithTabby({ amount: priceToMajorString(svc.price), label });
    setSaving(false);
    if (res.ok) {
      await markOrderPaid(orderId, res.paymentId ?? null);
      finalizeBooking(orderId);
    } else {
      await markOrderFailed(orderId, res.code ? res.code + ': ' + (res.error ?? '') : (res.error ?? 'unknown'));
      if (res.code === 'phone_required') { askForPhone(res.error); }
      else if (res.error && res.error !== 'canceled') { Alert.alert('Tabby', res.error); }
    }
  };

  const active = days[dayIdx];
  const pickLabel = isPackageContinue ? 'Pick a time' : (svc?.kind === 'package' ? 'Choose your first session time' : 'Pick a time');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={PAGE_WASH} style={styles.wash} pointerEvents="none" />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>BOOK A SESSION</Text>
        <View style={styles.nameRow}>
          <Text style={[styles.h1, styles.nameText]}>{expert ? expert.name : 'The Intend'}</Text>
          {expert ? (
            <Pressable style={styles.profileLink} onPress={() => router.push(`/expert/${id}`)} hitSlop={12}>
              <Ionicons name="person-circle-outline" size={22} color={COLORS.muted} />
            </Pressable>
          ) : null}
        </View>
        {expert ? <Text style={styles.sub}>{expert.title}</Text> : null}

        {svc ? (
          <View style={styles.offerCard}>
            <LinearGradient colors={CARD_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Text style={styles.offerMetaLine}>{isPackageContinue ? 'SESSION FROM YOUR PACKAGE' : svcHeaderMeta(svc)}</Text>
            <Text style={styles.offerName}>{svc.name}</Text>
            {svc.description ? <Text style={styles.offerDesc}>{svc.description}</Text> : null}
          </View>
        ) : null}

        {!requested && svc && svc.kind !== 'package' && linkedPkg ? (
          <Pressable style={styles.pkgLink} onPress={() => router.replace(`/book/${id}?service=${linkedPkg.id}`)}>
            <Ionicons name="albums-outline" size={18} color={COLORS.accent} />
            <Text style={styles.pkgLinkText}>Or get the {linkedPkg.sessionsTotal} session package for {linkedPkg.price}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </Pressable>
        ) : null}

        {requested ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.accent} />
            <Text style={styles.successTitle}>{wasRequest ? 'Session requested' : 'Session booked'}</Text>
            <Text style={styles.successText}>{chosenLabel}</Text>
            <Text style={styles.successSub}>{wasRequest ? 'The team will confirm and arrange payment. You will see it under Upcoming sessions.' : 'The expert will send you a link before your session. You will find it under Upcoming sessions.'}</Text>
            {remaining != null && pkgTotal != null ? (
              <Text style={styles.remainingLine}>{remaining} of {pkgTotal} sessions remaining in your package</Text>
            ) : null}
            {remaining != null ? (
              <Pressable style={styles.viewPkgBtn} onPress={() => router.replace('/my-packages')}>
                <Text style={styles.viewPkgText}>View my package</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Session type</Text>
            <View style={styles.typeRow}>
              {typeOptions.map((t) => {
                const on = t === type;
                return (
                  <Pressable key={t} onPress={() => setType(t)} style={[styles.type, on && styles.typeOn]}>
                    <Text style={[styles.typeText, on && styles.typeTextOn]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>{pickLabel}</Text>
            {loading ? (
              <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
            ) : days.length === 0 ? (
              <>
                <Text style={styles.note}>No open times in the next two weeks. Send a request and the team will find a time with you.</Text>
                <Pressable style={[styles.requestBtn, saving && styles.btnOff]} disabled={saving} onPress={async () => {
                  if (!requireAuth() || !expert) return; setSaving(true);
                  await createBooking({ refId: String(id), kind: 'service', title: bookingTitle(), when: 'Time to be confirmed', expert: expert.name, expertId: String(id) });
                  if ((expert as any)?.accountEmail) { sendPushToEmail((expert as any).accountEmail, 'New booking request', `${bookingTitle()} was requested.`); }
                  setChosenLabel('Time to be confirmed'); setWasRequest(true); setRequested(true); setSaving(false);
                }}>
                  <LinearGradient colors={INK_GRAD} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.requestText}>Send a request</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                  {days.map((d, i) => {
                    const on = i === dayIdx;
                    return (
                      <Pressable key={i} onPress={() => { setDayIdx(i); setHour(null); }} style={[styles.datePill, on && styles.datePillOn]}>
                        <Text style={[styles.dateWd, on && styles.dateOnText]}>{WD[d.date.getDay()]}</Text>
                        <Text style={[styles.dateNum, on && styles.dateOnText]}>{d.date.getDate()}</Text>
                        <Text style={[styles.dateMon, on && styles.dateOnText]}>{MON[d.date.getMonth()]}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.slotGrid}>
                  {active?.hours.map((h) => {
                    const on = h === hour;
                    return (
                      <Pressable key={h} onPress={() => setHour(h)} style={[styles.slot, on && styles.slotOn]}>
                        <Text style={[styles.slotText, on && styles.slotTextOn]}>{hourLabel(h)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.tzNote}>Times shown in {tzName()}. Busy times from the expert's Google Calendar are hidden.</Text>

                <Pressable style={[styles.requestBtn, hour == null && styles.btnOff]} disabled={hour == null} onPress={() => { if (!requireAuth()) return; (isReschedule || isPackageContinue || isFree) ? finalizeBooking() : (TABBY_ENABLED ? setPayChoiceOpen(true) : startPayment()); }}>
                  <LinearGradient colors={INK_GRAD} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <Text style={styles.requestText}>{isPackageContinue ? 'Book next session' : 'Book'}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={payChoiceOpen} transparent animationType="slide" onRequestClose={() => setPayChoiceOpen(false)}>
        <View style={styles.payRoot}>
          <Pressable style={styles.payBackdrop} onPress={() => setPayChoiceOpen(false)} />
          <View style={styles.paySheet}>
            <View style={styles.payHandle} />
            <Text style={styles.payTitle}>How would you like to pay?</Text>
            <Pressable style={styles.payOption} onPress={() => { setPayChoiceOpen(false); startPayment(); }}>
              <Ionicons name="card-outline" size={20} color={COLORS.ink} />
              <Text style={styles.payOptionText}>Card, Apple Pay or Link</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </Pressable>
            <Pressable style={styles.payOption} onPress={() => { setPayChoiceOpen(false); startTabby(); }}>
              <Text style={styles.payOptionText}>Pay in 4 with</Text>
              <TabbyLogo height={18} />
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 24, lineHeight: 30, color: COLORS.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameText: { flexShrink: 1 },
  profileLink: { paddingTop: 2 },
  sub: { fontSize: 13, letterSpacing: 1, color: COLORS.muted, marginTop: 6, marginBottom: 8, textTransform: 'uppercase' },
  offerCard: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', overflow: 'hidden', padding: 18, marginTop: 16 },
  offerName: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 23, color: COLORS.ink },
  offerMetaLine: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, marginBottom: 8, textTransform: 'uppercase' },
  offerDesc: { fontSize: 14, lineHeight: 21, color: COLORS.ink, opacity: 0.85, marginTop: 10 },
  pkgLink: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', borderRadius: 16, padding: 15, marginTop: 12 },
  pkgLinkText: { flex: 1, fontSize: 13, color: COLORS.ink },
  label: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginTop: 26, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  type: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  typeOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  typeText: { fontSize: 14, color: COLORS.ink },
  typeTextOn: { color: COLORS.bg },
  loaderBox: { paddingVertical: 30, alignItems: 'center' },
  note: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 4 },
  dateRow: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  datePill: { width: 62, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center' },
  datePillOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dateWd: { fontSize: 11, color: COLORS.muted },
  dateNum: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginVertical: 2 },
  dateMon: { fontSize: 11, color: COLORS.muted },
  dateOnText: { color: COLORS.bg },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  slot: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  slotOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  slotText: { fontSize: 13, color: COLORS.ink },
  slotTextOn: { color: COLORS.bg },
  tzNote: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 14 },
  requestBtn: { marginTop: 20, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.ink, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.5 },
  requestText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  tabbyLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, marginTop: 4 },
  tabbyLinkText: { color: COLORS.ink, fontSize: 14 },
  payRoot: { flex: 1, justifyContent: 'flex-end' },
  payBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  paySheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
  payHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 18 },
  payTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 16 },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 18, paddingHorizontal: 16, marginBottom: 12 },
  payOptionText: { fontSize: 15, color: COLORS.ink },
  successCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 24, marginTop: 28, alignItems: 'center' },
  successTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 12, marginBottom: 8 },
  successText: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.accent, textAlign: 'center' },
  successSub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  doneBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999, borderWidth: 1, borderColor: COLORS.ink },
  remainingLine: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink, textAlign: 'center', marginTop: 14 },
  viewPkgBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999, backgroundColor: COLORS.accent },
  viewPkgText: { fontSize: 14, color: COLORS.bg, letterSpacing: 0.5 },
  doneText: { fontSize: 14, color: COLORS.ink },
});
