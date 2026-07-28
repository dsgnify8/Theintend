import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { type AiMessage, getHistory, sendMessage } from '@/lib/yourAi';

export default function YourAi() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const user = session?.user ?? null;
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : undefined;

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thinkLabel, setThinkLabel] = useState('Thinking');
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getHistory(user.id).then((h) => { setMessages(h); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setThinkLabel(THINK_LABELS[Math.floor(Math.random() * THINK_LABELS.length)]);
    setSending(true);
    const res = await sendMessage(text, firstName);
    setSending(false);
    if (res.ok && res.reply) {
      setMessages((m) => [...m, { role: 'assistant', content: res.reply! }]);
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: 'I could not reach you just now. Try me again in a moment.' }]);
    }
  };

  const empty = !loading && messages.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>My Companion</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
        ) : (
          <ScrollView ref={scroller} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
            {empty ? (
              <View style={styles.intro}>
                <Text style={styles.introTitle}>I am here with you</Text>
                <Text style={styles.introBody}>
                  Tell me what is on your mind, or where you feel stuck. We can start anywhere. I will
                  help you see it more clearly.
                </Text>
              </View>
            ) : null}

            {messages.map((m, i) => (
              <View key={i} style={[styles.row, m.role === 'user' ? styles.rowUser : styles.rowAi]}>
                <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                    {m.content}
                  </Text>
                </View>
              </View>
            ))}

            {sending ? (
              <View style={[styles.row, styles.rowAi]}>
                <View style={styles.thinking}>
                  <ThinkingDots />
                  <Text style={styles.thinkingText}>{thinkLabel}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Say what is present for you"
            placeholderTextColor={COLORS.muted}
            multiline
            editable={!sending}
          />
          <Pressable style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]} onPress={send} disabled={!input.trim() || sending}>
            <Ionicons name="arrow-up" size={20} color={COLORS.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const THINK_LABELS = ['Thinking', 'Reflecting', 'Sitting with that'];

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.25, duration: 340, useNativeDriver: true }),
        Animated.delay(560 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, v]);
  return <Animated.View style={[styles.tdot, { opacity: v }]} />;
}

function ThinkingDots() {
  return (
    <View style={styles.tdots}>
      <Dot delay={0} />
      <Dot delay={140} />
      <Dot delay={280} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  thread: { padding: 16, paddingBottom: 24 },
  intro: { paddingVertical: 40, paddingHorizontal: 8 },
  introTitle: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, marginBottom: 12 },
  introBody: { fontSize: 15, lineHeight: 23, color: COLORS.muted },

  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  tdots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tdot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.muted },
  thinkingText: { fontSize: 13, color: COLORS.muted, opacity: 0.7 },
  row: { marginBottom: 14, flexDirection: 'row' },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '86%', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16 },
  bubbleUser: { backgroundColor: COLORS.ink, borderBottomRightRadius: 6 },
  bubbleAi: { backgroundColor: COLORS.card, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: COLORS.line },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: COLORS.bg },
  bubbleTextAi: { color: COLORS.ink },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.bg },
  input: { flex: 1, maxHeight: 120, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: COLORS.ink },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.4 },
});

