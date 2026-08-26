import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Required rather than imported, inside a try. A native module that is not in
// the build throws the moment it is imported, which takes the screen with it.
// This way the screen opens and only the microphone is missing.
let Speech: any = null;
let useSpeechEvent: (name: string, handler: (e: any) => void) => void = () => {};
let speechAvailable = false;
try {
  const mod = require('expo-speech-recognition');
  Speech = mod?.ExpoSpeechRecognitionModule ?? null;
  if (typeof mod?.useSpeechRecognitionEvent === 'function') {
    useSpeechEvent = mod.useSpeechRecognitionEvent;
  }
  speechAvailable = !!Speech;
} catch {
  // Left unavailable. The button says so.
}
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { CompanionIntro } from '@/components/CompanionIntro';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { DURATION, EASE, reduceMotion } from '@/constants/motion';
import { useAuth } from '@/lib/auth';
import { type AiMessage, type Conversation, conversationTitle, getConversations, sendMessage, setSession, setSessionMessages, startNewConversation, useCompanionSession, deleteConversation } from '@/lib/yourAi';
import { sendFeedback } from '@/lib/feedback';

export default function YourAi() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const user = session?.user ?? null;
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : undefined;

  // The conversation itself lives outside this screen, so leaving and coming
  // back picks up where it was.
  const convo = useCompanionSession();
  const messages = convo.messages;
  const setMessages = setSessionMessages;
  const threadId = convo.threadId;
  const readingPast = convo.readingPast;
  const setReadingPast = (v: boolean) => setSession({ readingPast: v });
  const [input, setInput] = useState('');
  // Speech goes into the box, never straight out. What was already typed is
  // held so dictation adds to it instead of replacing it.
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const baseInput = useRef('');

  useSpeechEvent('result', (e: any) => {
    const said = e?.results?.[0]?.transcript;
    if (typeof said !== 'string') return;
    const before = baseInput.current;
    setInput(before ? `${before} ${said}` : said);
  });
  useSpeechEvent('end', () => setListening(false));
  useSpeechEvent('nomatch', () => {
    setListening(false);
    setVoiceNote('I did not catch that. Try again a little closer.');
  });
  useSpeechEvent('error', (e: any) => {
    setListening(false);
    const code = e?.error;
    setVoiceNote(
      code === 'interrupted' ? 'Something interrupted that. Try again.'
      : code === 'no-speech' ? 'I did not hear anything.'
      : code === 'not-allowed' ? 'Microphone access is off. You can turn it on in Settings.'
      : code === 'network' ? 'That needs a connection to work.'
      : 'Speech is not working just now. You can type instead.',
    );
  });

  const startListening = async () => {
    setVoiceNote(null);
    const mod: any = Speech;
    // Checked rather than assumed, so a name that differs in this version
    // says so instead of taking the app down.
    if (typeof mod?.start !== 'function') {
      setVoiceNote('Speaking is not available on this build.');
      return;
    }
    try {
      if (typeof mod.requestPermissionsAsync === 'function') {
        const res = await mod.requestPermissionsAsync();
        if (res && res.granted === false) {
          setVoiceNote('Microphone access is off. You can turn it on in Settings.');
          return;
        }
      }
      baseInput.current = input.trim();
      setListening(true);
      mod.start({ lang: 'en-US', interimResults: true, continuous: false });
    } catch {
      setListening(false);
      setVoiceNote('Speech is not working just now. You can type instead.');
    }
  };

  const stopListening = () => {
    const mod: any = Speech;
    try {
      if (typeof mod?.stop === 'function') mod.stop();
    } catch {}
    setListening(false);
  };
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thinkLabel, setThinkLabel] = useState('Thinking');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const sendTheFeedback = async () => {
    if (!feedbackText.trim() || feedbackBusy) return;
    setFeedbackBusy(true);
    const { error } = await sendFeedback(feedbackText);
    setFeedbackBusy(false);
    if (error) {
      Alert.alert('That did not send', error.message ?? 'Try again in a moment.');
      return;
    }
    setFeedbackText('');
    setFeedbackDone(true);
    // Long enough to read, short enough not to be in the way.
    setTimeout(() => { setFeedbackOpen(false); setFeedbackDone(false); }, 1600);
  };
  // Only one row sits open at a time.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const greeting = useRef(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]).current;
  // Which message is being written out, and how much of it is showing.
  const [typeState, setTypeState] = useState<{ index: number; shown: number } | null>(null);
  const [still, setStill] = useState(false);
  // Messages already on screen when a past conversation is opened. Those do
  // not animate in, or the whole thread arrives at once.
  const settledBefore = useRef(0);
  // Coming back to a conversation in progress should not animate it in again.
  useEffect(() => { settledBefore.current = convo.messages.length; }, []);

  useEffect(() => {
    let alive = true;
    reduceMotion().then((on) => { if (alive) setStill(on); });
    return () => { alive = false; };
  }, []);

  // Reveals the reply a few characters at a time once it has landed.
  useEffect(() => {
    if (!typeState) return;
    const full = messages[typeState.index]?.content ?? '';
    if (typeState.shown >= full.length) { setTypeState(null); return; }
    const t = setTimeout(() => {
      setTypeState((st) => (st ? { ...st, shown: Math.min(full.length, st.shown + 7) } : null));
    }, 16);
    return () => clearTimeout(t);
  }, [typeState, messages]);
  const scroller = useRef<ScrollView>(null);

  // Opens on an empty thread every time. Past conversations live behind the
  // clock icon rather than being scrolled back into.
  useEffect(() => {
    setLoading(false);
    if (!user) return;
    getConversations(user.id).then(setConversations).catch(() => {});
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, sending, typeState]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setThinkLabel(THINK_LABELS[Math.floor(Math.random() * THINK_LABELS.length)]);
    setSending(true);
    const res = await sendMessage(text, firstName, threadId);
    setSending(false);
    if (res.ok && res.reply) {
      setMessages((m) => {
        const next = [...m, { role: 'assistant', content: res.reply! }];
        if (!still) setTypeState({ index: next.length - 1, shown: 0 });
        return next;
      });
    } else {
      setMessages((m) => [...m, { role: 'assistant', content: 'I could not reach you just now. Try me again in a moment.' }]);
    }
  };

  const askDelete = (c: Conversation) => {
    Alert.alert(
      'Delete this conversation',
      'It will be gone for good, and your companion will no longer have it.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            const ok = await deleteConversation(user.id, c);
            if (ok) {
              setConversations((list) => list.filter((x) => x.id !== c.id));
              setOpenRow(null);
            }
          },
        },
      ],
    );
  };

  const empty = !loading && messages.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={AI_WASH} style={styles.wash} pointerEvents="none" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>MY COMPANION</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setFeedbackOpen(true)} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="information-circle-outline" size={21} color={COLORS.ink} />
          </Pressable>
          <Pressable onPress={() => setHistOpen(true)} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="time-outline" size={21} color={COLORS.ink} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
        ) : (
          <ScrollView ref={scroller} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
            {empty ? (
              <View style={styles.intro}>
                <Text style={styles.introTitle}>
                  {firstName ? `${greeting.title}, ${firstName}` : greeting.title}
                </Text>
                <Text style={styles.introBody}>{greeting.body}</Text>
              </View>
            ) : null}

            {messages.map((m, i) => {
              const typingThis = typeState?.index === i;
              const text = typingThis ? m.content.slice(0, typeState!.shown) : m.content;
              return (
                <Appear key={i} animate={!still && i >= settledBefore.current} style={[styles.row, m.role === 'user' ? styles.rowUser : styles.rowAi]}>
                  <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                    <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                      {text}
                    </Text>
                  </View>
                </Appear>
              );
            })}

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

        {readingPast ? (
          <Pressable style={styles.backToNew} onPress={() => { settledBefore.current = 0; startNewConversation(); }}>
            <Ionicons name="add" size={16} color={COLORS.taupeBlue} />
            <Text style={styles.backToNewText}>Start a new conversation</Text>
          </Pressable>
        ) : null}

        {listening || voiceNote ? (
          <View style={styles.voiceBar}>
            <Text style={styles.voiceText}>{listening ? 'Listening, hold to keep going' : voiceNote}</Text>
          </View>
        ) : null}

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
          {speechAvailable ? (
          <Pressable
            style={[styles.micBtn, listening && styles.micBtnOn]}
            onPressIn={startListening}
            onPressOut={stopListening}
            disabled={sending}
            hitSlop={8}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={20} color={listening ? COLORS.bg : COLORS.ink} />
          </Pressable>
          ) : null}
          <Pressable style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]} onPress={send} disabled={!input.trim() || sending}>
            <Ionicons name="arrow-up" size={20} color={COLORS.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={histOpen} transparent animationType="slide" onRequestClose={() => setHistOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setHistOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Past conversations</Text>
            {conversations.length === 0 ? (
              <Text style={styles.sheetEmpty}>Nothing here yet. Anything you talk about will be kept for you.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {conversations.map((c) => (
                  <SwipeRow
                    key={c.id}
                    id={c.id}
                    openRow={openRow}
                    setOpenRow={setOpenRow}
                    onDelete={() => askDelete(c)}
                  >
                  <Pressable
                    style={styles.histRow}
                    onPress={() => {
                      settledBefore.current = c.messages.length;
                      setTypeState(null);
                      setMessages(c.messages.map((m) => ({ role: m.role, content: m.content })));
                      setReadingPast(true);
                      setHistOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histTitle} numberOfLines={2}>{conversationTitle(c)}</Text>
                      <Text style={styles.histWhen}>{shortWhen(c.startedAt)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                  </Pressable>
                  </SwipeRow>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedbackOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setFeedbackOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Leave feedback</Text>

              {feedbackDone ? (
                <Text style={styles.fbThanks}>Sent. Thank you, we read all of it.</Text>
              ) : (
                <>
                  <Text style={styles.fbNote}>
                    What is working, what is not, anything that felt off. It goes straight to us.
                  </Text>
                  <TextInput
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    placeholder="Write as much as you like"
                    placeholderTextColor={COLORS.muted}
                    multiline
                    textAlignVertical="top"
                    style={styles.fbInput}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.fbSend, (!feedbackText.trim() || feedbackBusy) && { opacity: 0.45 }]}
                    disabled={!feedbackText.trim() || feedbackBusy}
                    onPress={sendTheFeedback}
                  >
                    {feedbackBusy
                      ? <ActivityIndicator color={COLORS.bg} />
                      : <Text style={styles.fbSendText}>Send</Text>}
                  </Pressable>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <CompanionIntro userId={user?.id} />
    </SafeAreaView>
  );
}

// Warm at the top, clearing before the thread gets going.
const AI_WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

const ACTION_W = 84;

// Swipe to reveal, tap to delete. PanResponder rather than gesture handler,
// because this list lives inside a Modal, where gesture handler does not
// reliably receive touches on iOS.
function SwipeRow({
  id, openRow, setOpenRow, onDelete, children,
}: {
  id: string;
  openRow: string | null;
  setOpenRow: (v: string | null) => void;
  onDelete: () => void;
  children: any;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  // Read at gesture time rather than captured when the responder was built.
  const claim = useRef<() => void>(() => {});
  claim.current = () => setOpenRow(id);

  const snap = (to: number) => {
    isOpen.current = to !== 0;
    Animated.timing(x, { toValue: to, duration: 180, easing: EASE, useNativeDriver: true }).start();
  };

  // Another row opened, so this one closes.
  useEffect(() => {
    if (openRow !== id && isOpen.current) snap(0);
  }, [openRow, id]);

  const pan = useRef(
    PanResponder.create({
      // Sideways and deliberate, so the list still scrolls.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderGrant: () => claim.current(),
      onPanResponderMove: (_e, g) => {
        const base = isOpen.current ? -ACTION_W : 0;
        x.setValue(Math.min(0, Math.max(-ACTION_W, base + g.dx)));
      },
      onPanResponderRelease: (_e, g) => {
        const base = isOpen.current ? -ACTION_W : 0;
        snap(base + g.dx < -ACTION_W / 2 ? -ACTION_W : 0);
      },
      onPanResponderTerminate: () => snap(0),
    }),
  ).current;

  return (
    <View style={styles.swipeWrap}>
      <Pressable style={styles.swipeAction} onPress={onDelete}>
        <Ionicons name="trash-outline" size={19} color="#FFFFFF" />
      </Pressable>
      <Animated.View style={[styles.swipeFace, { transform: [{ translateX: x }] }]} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const THINK_LABELS = ['Thinking', 'Reflecting', 'Sitting with that'];

// One is picked per visit, so it does not read the same every time.
const GREETINGS = [
  { title: 'Welcome back', body: 'What is on your mind today?' },
  { title: 'Good to see you', body: 'What would you like to work through?' },
  { title: 'Hello again', body: 'Tell me what is present for you.' },
  { title: 'Here when you are', body: 'Where would you like to start?' },
];

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hh = ((d.getHours() + 11) % 12) + 1;
  const mm = d.getMinutes() < 10 ? '0' + d.getMinutes() : String(d.getMinutes());
  const time = hh + ':' + mm + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
  if (sameDay) return 'Today, ' + time;
  return d.getDate() + ' ' + MON3[d.getMonth()] + ', ' + time;
}

// A bubble that arrives rather than appearing. Rendered plain when animation
// is off, so nothing is left half faded.
function Appear({ animate, style, children }: { animate: boolean; style?: any; children: any }) {
  const v = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.timing(v, {
      toValue: 1,
      duration: DURATION.colour,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [animate, v]);
  if (!animate) return <View style={style}>{children}</View>;
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

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
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(232,225,218,0.6)' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 11, letterSpacing: 2.4, color: COLORS.muted },
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
  bubbleAi: { backgroundColor: 'rgba(255,255,255,0.62)', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: COLORS.bg },
  bubbleTextAi: { color: COLORS.ink },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.bg },
  input: { flex: 1, maxHeight: 120, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: COLORS.ink },
  micBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  micBtnOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  voiceBar: { paddingHorizontal: 18, paddingBottom: 8 },
  voiceText: { fontSize: 12, color: COLORS.muted },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.taupeBlue, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.4 },

  backToNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  backToNewText: { fontSize: 14, color: COLORS.taupeBlue },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  fbNote: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 14 },
  fbInput: { minHeight: 120, maxHeight: 220, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, lineHeight: 22, color: COLORS.ink },
  fbSend: { marginTop: 14, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  fbSendText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.4 },
  fbThanks: { fontSize: 15, lineHeight: 23, color: COLORS.ink, paddingVertical: 18, paddingBottom: 26 },
  sheetEmpty: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingVertical: 10, paddingBottom: 22 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.line },
  histTitle: { fontSize: 15, lineHeight: 21, color: COLORS.ink },
  histWhen: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  swipeWrap: { position: 'relative', overflow: 'hidden' },
  // Sits behind the row and is only seen once the row moves off it.
  swipeAction: { position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W, backgroundColor: '#8F4A3B', alignItems: 'center', justifyContent: 'center' },
  swipeFace: { backgroundColor: COLORS.bg },
});

