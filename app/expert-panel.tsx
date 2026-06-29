import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail } from '@/lib/experts';
import { useSessions } from '@/lib/sessions';
import type { Expert } from '@/constants/experts';

export default function ExpertPanel() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);

  useEffect(() => {
    if (user?.email) getExpertForEmail(user.email).then(setExpert);
    else setExpert(null);
  }, [user?.email]);

  const { classes: CLASSES, programs: PROGRAMS } = useSessions();

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
          <Text style={styles.notLinkedText}>
            Your expert profile isn't linked to this account yet. Ask the admin to add your email to your expert profile.
          </Text>
        </View>
      </Screen>
    );
  }

  const classes = CLASSES.filter((c) => c.expertId === expert.id);
  const programs = PROGRAMS.filter((p) => p.expertId === expert.id);
  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <Screen router={router}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            {expert.photo ? <Image source={{ uri: expert.photo }} style={styles.avatarImg} resizeMode="cover" /> : <Text style={styles.avatarText}>{initials}</Text>}
          </View>
          <Text style={styles.name}>{expert.name}</Text>
          <Text style={styles.title}>{expert.title.toUpperCase()}</Text>
          <Pressable style={styles.viewPublic} onPress={() => router.push(`/expert/${expert.id}`)}>
            <Text style={styles.viewPublicText}>View public profile</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Your offerings</Text>
        <OfferRow icon="person-outline" title="1:1 consultation" meta="Online or in person" />
        {programs.map((p) => (
          <OfferRow key={p.id} icon="ribbon-outline" title={p.title} meta={`${p.weeks} weeks · ${p.price}`} />
        ))}
        {classes.map((c) => (
          <OfferRow key={c.id} icon="videocam-outline" title={c.title} meta={`${c.date} · ${c.durationHours}h live`} />
        ))}

        <Text style={styles.sectionTitle}>Who's booked with you</Text>
        <View style={styles.soon}>
          <Text style={styles.soonText}>Booking records appear here once live bookings are connected (next sub-step).</Text>
        </View>

        <Text style={styles.sectionTitle}>Manage</Text>
        <Pressable style={styles.row} onPress={() => router.push('/expert-edit')}>
          <View style={styles.rowIcon}><Ionicons name="create-outline" size={18} color={COLORS.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Edit my profile</Text>
            <Text style={styles.rowMeta}>Submit photo & bio changes for approval</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
        <View style={[styles.row, { opacity: 0.55 }]}>
          <View style={styles.rowIcon}><Ionicons name="add-circle-outline" size={18} color={COLORS.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Add a class or program</Text>
            <Text style={styles.rowMeta}>Propose a new offering for approval</Text>
          </View>
          <Text style={styles.soonTag}>Soon</Text>
        </View>
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

function OfferRow({ icon, title, meta }: { icon: any; title: string; meta: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={COLORS.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
    </View>
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
  head: { alignItems: 'center', paddingVertical: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 14 },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink, textAlign: 'center' },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  viewPublic: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1, borderColor: COLORS.ink },
  viewPublicText: { fontSize: 14, color: COLORS.ink },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  rowMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  soon: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 18 },
  soonText: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  soonTag: { fontSize: 11, color: COLORS.muted, backgroundColor: COLORS.accentSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
});
