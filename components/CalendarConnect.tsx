import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { getCalendarStatus, connectCalendar, disconnectCalendar, type CalStatus } from '@/lib/calendar';

export function CalendarConnect({ expertId }: { expertId: string }) {
  const [status, setStatus] = useState<CalStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try { setStatus(await getCalendarStatus(expertId)); }
    catch { setStatus({ connected: false, email: null }); }
  };
  useEffect(() => { load(); }, [expertId]);

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      const ok = await connectCalendar(expertId);
      await load();
      if (!ok) setMsg('Connection was cancelled.');
    } catch (e: any) {
      setMsg(e?.message ?? 'Could not connect. Check the setup guide.');
    }
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true); setMsg(null);
    try { await disconnectCalendar(expertId); await load(); } catch {}
    setBusy(false);
  };

  const connected = status?.connected;

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.icon}><Ionicons name="logo-google" size={18} color={COLORS.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Google Calendar</Text>
          <Text style={styles.meta}>
            {status == null ? 'Checking…' : connected ? `Connected${status.email ? ' · ' + status.email : ''}` : 'Not connected'}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : connected ? (
          <Pressable onPress={disconnect}><Text style={styles.disconnect}>Disconnect</Text></Pressable>
        ) : (
          <Pressable style={styles.connectBtn} onPress={connect}><Text style={styles.connectText}>Connect</Text></Pressable>
        )}
      </View>
      <Text style={styles.help}>
        {connected
          ? 'Your busy times block automatically, and new bookings are added to your calendar.'
          : 'Connect so your existing calendar blocks your availability automatically.'}
      </Text>
      {msg ? <Text style={styles.err}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  title: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  connectBtn: { backgroundColor: COLORS.accent, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 },
  connectText: { color: COLORS.bg, fontSize: 13 },
  disconnect: { fontSize: 13, color: COLORS.muted },
  help: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 12 },
  err: { fontSize: 12, color: '#9B5A4A', marginTop: 8 },
});
