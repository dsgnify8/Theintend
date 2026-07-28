import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { getWorksheet } from '@/constants/worksheets';
import {
  createWorksheetEntry,
  getDraft,
  getWorksheetEntry,
  saveDraft,
  updateWorksheetEntry,
  type WorksheetAnswers,
} from '@/lib/worksheets';

const GOLD = '#B08968';

const PAGE_TITLES = [
  'Cover',
  'Before you begin',
  'Part one: Find your purpose',
  'Ikigai: love and skill',
  'Ikigai: the world and value',
  'Where the four meet',
  'Part two: Work toward it',
  'Stage one: your inclinations',
  'Stage two: the apprenticeship',
  'Stage three: toward mastery',
  'Part three: the Wheel of Life',
  'Reading your wheel',
  'Your purpose, in your words',
];

const WHEEL_AREAS = [
  { id: 'health', label: 'Health and body', short: 'Health' },
  { id: 'work', label: 'Work and career', short: 'Work' },
  { id: 'money', label: 'Money and security', short: 'Money' },
  { id: 'love', label: 'Love and relationships', short: 'Love' },
  { id: 'growth', label: 'Personal growth', short: 'Growth' },
  { id: 'fun', label: 'Fun and recreation', short: 'Fun' },
  { id: 'space', label: 'Home and environment', short: 'Space' },
  { id: 'meaning', label: 'Meaning and spirit', short: 'Meaning' },
];

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ---- illustrations -------------------------------------------------------
function CompassEmblem() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={50} fill="none" stroke={GOLD} strokeWidth={1.5} />
      <Circle cx={60} cy={60} r={40} fill="none" stroke={COLORS.line} strokeWidth={1} />
      <Polygon points="60,20 68,60 60,72 52,60" fill={COLORS.accent} />
      <Polygon points="60,100 52,60 60,48 68,60" fill={GOLD} opacity={0.55} />
      <Circle cx={60} cy={60} r={4} fill={COLORS.accent} />
      <SvgText x={60} y={16} fontSize={9} fill={COLORS.muted} textAnchor="middle">N</SvgText>
    </Svg>
  );
}

function IkigaiDiagram() {
  const circles = [
    { cx: 90, cy: 78, fill: 'rgba(179,110,90,0.22)', stroke: '#B36E5A' },
    { cx: 130, cy: 78, fill: 'rgba(176,137,104,0.22)', stroke: GOLD },
    { cx: 90, cy: 118, fill: 'rgba(120,130,110,0.22)', stroke: '#78826E' },
    { cx: 130, cy: 118, fill: 'rgba(150,120,140,0.20)', stroke: '#96788C' },
  ];
  return (
    <Svg width={260} height={210} viewBox="0 0 220 200">
      {circles.map((c, i) => (
        <Circle key={i} cx={c.cx} cy={c.cy} r={52} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} />
      ))}
      <SvgText x={62} y={40} fontSize={10} fill={COLORS.ink} textAnchor="middle">What you</SvgText>
      <SvgText x={62} y={52} fontSize={11} fill={COLORS.ink} textAnchor="middle" fontWeight="bold">LOVE</SvgText>
      <SvgText x={158} y={40} fontSize={10} fill={COLORS.ink} textAnchor="middle">Good at</SvgText>
      <SvgText x={158} y={52} fontSize={11} fill={COLORS.ink} textAnchor="middle" fontWeight="bold">SKILL</SvgText>
      <SvgText x={62} y={168} fontSize={10} fill={COLORS.ink} textAnchor="middle">World</SvgText>
      <SvgText x={62} y={180} fontSize={11} fill={COLORS.ink} textAnchor="middle" fontWeight="bold">NEEDS</SvgText>
      <SvgText x={158} y={168} fontSize={10} fill={COLORS.ink} textAnchor="middle">Paid for</SvgText>
      <SvgText x={158} y={180} fontSize={11} fill={COLORS.ink} textAnchor="middle" fontWeight="bold">VALUE</SvgText>
      <SvgText x={110} y={101} fontSize={12} fill={COLORS.accent} textAnchor="middle" fontWeight="bold">IKIGAI</SvgText>
    </Svg>
  );
}

function MasteryPath() {
  return (
    <Svg width={260} height={150} viewBox="0 0 260 150">
      <Path d="M20 120 L90 120 L150 80 L230 40" fill="none" stroke={COLORS.line} strokeWidth={2} strokeDasharray="3 5" />
      <Rect x={20} y={118} width={54} height={22} rx={6} fill={COLORS.accentSoft} />
      <SvgText x={47} y={133} fontSize={13} fill={COLORS.accent} textAnchor="middle" fontWeight="bold">1</SvgText>
      <Rect x={104} y={78} width={54} height={22} rx={6} fill={COLORS.accentSoft} />
      <SvgText x={131} y={93} fontSize={13} fill={COLORS.accent} textAnchor="middle" fontWeight="bold">2</SvgText>
      <Rect x={188} y={30} width={54} height={22} rx={6} fill={COLORS.accent} />
      <SvgText x={215} y={45} fontSize={13} fill={COLORS.bg} textAnchor="middle" fontWeight="bold">3</SvgText>
      <Polygon points="215,14 219,24 229,24 221,30 224,40 215,34 206,40 209,30 201,24 211,24" fill={GOLD} />
    </Svg>
  );
}

function WheelRadar({ ratings }: { ratings: Record<string, number> }) {
  const cx = 150;
  const cy = 150;
  const maxR = 100;
  const axes = WHEEL_AREAS.map((a, i) => {
    const ang = (-90 + i * 45) * (Math.PI / 180);
    return { a, ang, ex: cx + maxR * Math.cos(ang), ey: cy + maxR * Math.sin(ang) };
  });
  const poly = axes
    .map(({ a, ang }) => {
      const r = (Math.max(0, Math.min(10, ratings[a.id] ?? 5)) / 10) * maxR;
      return `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
    })
    .join(' ');
  const ringPts = (rr: number) =>
    axes.map(({ ang }) => `${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)}`).join(' ');
  return (
    <Svg width={300} height={300} viewBox="0 0 300 300">
      <Polygon points={ringPts(maxR)} fill="none" stroke={COLORS.line} strokeWidth={1} />
      <Polygon points={ringPts(maxR * 0.66)} fill="none" stroke={COLORS.line} strokeWidth={1} />
      <Polygon points={ringPts(maxR * 0.33)} fill="none" stroke={COLORS.line} strokeWidth={1} />
      {axes.map(({ ex, ey }, i) => (
        <Line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={COLORS.line} strokeWidth={1} />
      ))}
      <Polygon points={poly} fill="rgba(176,137,104,0.28)" stroke={COLORS.accent} strokeWidth={1.5} />
      {axes.map(({ a, ang }, i) => {
        const lx = cx + (maxR + 20) * Math.cos(ang);
        const ly = cy + (maxR + 20) * Math.sin(ang) + 3;
        return (
          <SvgText key={i} x={lx} y={ly} fontSize={10} fill={COLORS.muted} textAnchor="middle">
            {a.short}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ---- small building blocks ----------------------------------------------
function Field({ label, helper, value, onChange, placeholder }: { label?: string; helper?: string; value: string; onChange: (t: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'Write here'}
        placeholderTextColor={COLORS.muted}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export default function WorksheetScreen() {
  const router = useRouter();
  const { id, entry } = useLocalSearchParams<{ id: string; entry?: string }>();
  const worksheet = getWorksheet(String(id));
  const editingEntryId = typeof entry === 'string' && entry.length > 0 ? entry : null;

  const [answers, setAnswers] = useState<WorksheetAnswers>({});
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      if (editingEntryId) {
        const e = await getWorksheetEntry(editingEntryId);
        setAnswers(e?.answers ?? {});
        setPage(0);
      } else {
        const d = await getDraft(String(id));
        setAnswers(d?.answers ?? {});
        setPage(d?.page ?? 0);
      }
      setLoaded(true);
    })();
  }, [id, editingEntryId]);

  // Autosave the working draft (not when editing a saved copy).
  useEffect(() => {
    if (!loaded || editingEntryId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveDraft(String(id), answers, page); }, 700);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [answers, page, loaded, editingEntryId, id]);

  const set = (key: string, val: string) => { setAnswers((prev) => ({ ...prev, [key]: val })); setSavedMsg(null); };
  const get = (key: string) => answers[key] ?? '';
  const ratings: Record<string, number> = {};
  for (const a of WHEEL_AREAS) ratings[a.id] = num(answers[`wheel_${a.id}`], 5);
  const lowest = [...WHEEL_AREAS].sort((x, y) => ratings[x.id] - ratings[y.id])[0];

  if (!worksheet) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.note}>This worksheet could not be found.</Text>
      </SafeAreaView>
    );
  }

  const saveCopy = async () => {
    setSaving(true);
    if (editingEntryId) {
      await updateWorksheetEntry(editingEntryId, answers);
      setSavedMsg('Changes saved to this copy.');
    } else {
      await createWorksheetEntry(String(id), answers);
      setSavedMsg('Saved to your workbook. You can find it on the Worksheets page.');
    }
    setSaving(false);
  };

  // ---- the pages ---------------------------------------------------------
  const pages: React.ReactNode[] = [
    // 0 - cover
    <View key="cover" style={styles.centerBlock}>
      <CompassEmblem />
      <Text style={styles.kicker}>THE INTEND WORKBOOK</Text>
      <Text style={styles.coverTitle}>{worksheet.title}</Text>
      <Text style={styles.coverSub}>How to find, live and refine your life purpose</Text>
      <Text style={styles.body}>Most people who go looking for their purpose are not lost causes waiting to be fixed. They are capable people who have simply lost the thread of what matters to them. This short book helps you pick that thread back up.</Text>
      <Text style={styles.body}>You will move through three questions. What your purpose is. How to work toward it. And how to stay aligned to it over time. Write honestly. No one sees this but you.</Text>
      <Text style={styles.quietNote}>Find a quiet twenty minutes. You can leave and come back anytime, your writing saves as you go.</Text>
    </View>,

    // 1 - how to use
    <View key="how">
      <Text style={styles.kicker}>BEFORE YOU BEGIN</Text>
      <Text style={styles.h2}>There are no right answers here</Text>
      <Text style={styles.body}>Purpose is not a single correct sentence hidden somewhere waiting to be guessed. It is something you circle closer to by paying attention. A first draft is enough. You will refine it for the rest of your life.</Text>
      <Text style={styles.body}>Answer as the person you actually are, not the one you think you should be. The more honest the input, the more useful the picture.</Text>
      <Field label="Why did you open this today?" helper="What made purpose feel worth looking at right now?" value={get('intro_why')} onChange={(t) => set('intro_why', t)} />
    </View>,

    // 2 - Part I intro (Ikigai)
    <View key="p1">
      <Text style={styles.kicker}>PART ONE</Text>
      <Text style={styles.h2}>Find your purpose</Text>
      <View style={styles.illus}><IkigaiDiagram /></View>
      <Text style={styles.body}>Ikigai is a Japanese idea that roughly means a reason for being. It sits where four things meet: what you love, what you are good at, what the world needs, and what you can be paid for.</Text>
      <Text style={styles.body}>On their own, each one is incomplete. What you love but cannot do well stays a daydream. What you are paid for but do not care about drains you. Purpose tends to live in the overlap. We will look at each circle, then bring them together.</Text>
    </View>,

    // 3 - love + skill
    <View key="p1a">
      <Text style={styles.partTag}>IKIGAI</Text>
      <Field label="What you love" helper="What do you lose track of time in? What would you still do if no one paid you? What lights you up when you talk about it?" value={get('love')} onChange={(t) => set('love', t)} />
      <Field label="What you are good at" helper="Your real strengths and skills. What do people come to you for? What feels easy to you that others find hard?" value={get('good_at')} onChange={(t) => set('good_at', t)} />
    </View>,

    // 4 - world needs + paid
    <View key="p1b">
      <Text style={styles.partTag}>IKIGAI</Text>
      <Field label="What the world needs" helper="Which problems actually move you? Who do you want to help, and what would be different if you did?" value={get('world_needs')} onChange={(t) => set('world_needs', t)} />
      <Field label="What you can be paid for" helper="Where do your gifts meet something people value enough to support? Be practical, not modest." value={get('paid_for')} onChange={(t) => set('paid_for', t)} />
    </View>,

    // 5 - synthesis
    <View key="p1c">
      <Text style={styles.kicker}>WHERE THEY MEET</Text>
      <Text style={styles.h2}>Bringing the four together</Text>
      <Text style={styles.body}>Love and skill meeting is your passion. Love and what the world needs is your mission. What the world needs and what you can be paid for is your vocation. Skill and pay is your profession. Where all four overlap is your ikigai.</Text>
      <View style={styles.recap}>
        <Text style={styles.recapLine}>Love: {get('love') || 'not yet written'}</Text>
        <Text style={styles.recapLine}>Skill: {get('good_at') || 'not yet written'}</Text>
        <Text style={styles.recapLine}>World needs: {get('world_needs') || 'not yet written'}</Text>
        <Text style={styles.recapLine}>Paid for: {get('paid_for') || 'not yet written'}</Text>
      </View>
      <Field label="What sits in the middle for you?" helper="One or two sentences. A rough guess is enough for now." value={get('ikigai_center')} onChange={(t) => set('ikigai_center', t)} />
    </View>,

    // 6 - Part II intro (Life's Task / Mastery)
    <View key="p2">
      <Text style={styles.kicker}>PART TWO</Text>
      <Text style={styles.h2}>Work toward your purpose</Text>
      <View style={styles.illus}><MasteryPath /></View>
      <Text style={styles.body}>Purpose is not only found, it is built. In his book Mastery, Robert Greene describes a Life's Task, the particular work you are suited to, and a path toward it in three stages.</Text>
      <Text style={styles.body}>First you reconnect with your natural inclinations. Then you serve a deep apprenticeship, studying, practicing and observing people who are masters of the field. Finally you reach mastery, where what you know becomes a perspective and a style that is unmistakably yours.</Text>
    </View>,

    // 7 - stage 1
    <View key="p2a">
      <Text style={styles.partTag}>STAGE ONE</Text>
      <Text style={styles.h2}>Reconnect with your inclinations</Text>
      <Text style={styles.body}>Before the world told you what to want, certain things pulled at you. Greene suggests your Life's Task is often hidden in those early, honest inclinations.</Text>
      <Field label="What pulled at you?" helper="What did you love as a child, before it was useful? What interests keep returning no matter how much you ignore them?" value={get('lifetask_inclinations')} onChange={(t) => set('lifetask_inclinations', t)} />
    </View>,

    // 8 - stage 2
    <View key="p2b">
      <Text style={styles.partTag}>STAGE TWO</Text>
      <Text style={styles.h2}>The apprenticeship</Text>
      <Text style={styles.body}>Mastery is earned through deep, patient practice, and through watching how the best actually work. This stage is about learning, not proving.</Text>
      <Field label="What do you most need to learn and practice now?" helper="Be specific about the skill, and about how you would practice it." value={get('lifetask_apprenticeship')} onChange={(t) => set('lifetask_apprenticeship', t)} />
      <Field label="Who are your masters?" helper="Name two or three people, living or not, whose path and work you can study closely." value={get('lifetask_masters')} onChange={(t) => set('lifetask_masters', t)} />
    </View>,

    // 9 - stage 3
    <View key="p2c">
      <Text style={styles.partTag}>STAGE THREE</Text>
      <Text style={styles.h2}>Toward mastery</Text>
      <Text style={styles.body}>Mastery is where your knowledge, experience and taste combine into something only you would make. You stop copying the field and start adding to it.</Text>
      <Field label="What would your own style or contribution be?" helper="Where do your skills, story and point of view meet? What would you make that no one else quite could?" value={get('lifetask_mastery')} onChange={(t) => set('lifetask_mastery', t)} />
    </View>,

    // 10 - Part III (Wheel of Life)
    <View key="p3">
      <Text style={styles.kicker}>PART THREE</Text>
      <Text style={styles.h2}>Realign to your purpose</Text>
      <Text style={styles.body}>Purpose is easy to drift from. The Wheel of Life gives you a quick, honest read on where your life feels full and where it feels thin. Rate each area from zero to ten as it is now, not as you wish it were. The shape updates as you go.</Text>
      <View style={styles.illus}><WheelRadar ratings={ratings} /></View>
      {WHEEL_AREAS.map((a) => (
        <View key={a.id} style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>{a.label}</Text>
          <View style={styles.sliderBody}>
            <Slider
              style={{ flex: 1, height: 34 }}
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={ratings[a.id]}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.line}
              thumbTintColor={COLORS.accent}
              onValueChange={(v) => set(`wheel_${a.id}`, String(Math.round(v)))}
            />
            <Text style={styles.sliderValue}>{ratings[a.id]}</Text>
          </View>
        </View>
      ))}
    </View>,

    // 11 - wheel reflection
    <View key="p3b">
      <Text style={styles.kicker}>WHAT THE WHEEL SHOWS</Text>
      <Text style={styles.h2}>Reading your shape</Text>
      <Text style={styles.body}>A balanced wheel rolls. A lopsided one drags. The point is not a perfect ten everywhere, it is noticing where a small lift would change how the whole thing turns.</Text>
      <Text style={styles.callout}>Your lowest area right now looks like {lowest.label.toLowerCase()}.</Text>
      <Field label="Which area, if it improved, would lift the others?" helper="It is not always the lowest one. Trust your read." value={get('wheel_focus')} onChange={(t) => set('wheel_focus', t)} />
      <Field label="One small step you could take there this week" helper="Small and specific beats big and vague." value={get('wheel_step')} onChange={(t) => set('wheel_step', t)} />
    </View>,

    // 12 - closing
    <View key="close">
      <Text style={styles.kicker}>BRING IT TOGETHER</Text>
      <Text style={styles.h2}>Your purpose, in your words</Text>
      <Text style={styles.body}>Pull the threads together into a working sentence. It does not need to be final or impressive. Purpose is refined over a life, not fixed in a day.</Text>
      <Field label="My purpose, for now, is..." helper="Draw on your ikigai, your Life's Task, and what your wheel showed you." value={get('purpose_statement')} onChange={(t) => set('purpose_statement', t)} />
      <Field label="The first steps I will take" helper="Two or three concrete moves, however small." value={get('first_steps')} onChange={(t) => set('first_steps', t)} />
      <Text style={styles.quietNote}>Come back to this every few months. Save a copy each time so you can see how your answer changes.</Text>
      {savedMsg ? <Text style={styles.savedNote}>{savedMsg}</Text> : null}
      <Pressable style={[styles.saveBtn, saving && styles.btnOff]} disabled={saving} onPress={saveCopy}>
        {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>{editingEntryId ? 'Save changes' : 'Save a copy to my workbook'}</Text>}
      </Pressable>
    </View>,
  ];

  const total = pages.length;
  const isLast = page >= total - 1;
  const progress = ((page + 1) / total) * 100;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>{editingEntryId ? 'Saved copy' : 'Worksheets'}</Text>
        </Pressable>
        <Pressable style={styles.contentsBtn} onPress={() => setContentsOpen(true)} hitSlop={8}>
          <Text style={styles.pageCount}>{page + 1} of {total}</Text>
          <Ionicons name="list-outline" size={18} color={COLORS.ink} />
        </Pressable>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>

      {!loaded ? (
        <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.paper}>{pages[page]}</View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={[styles.navBtn, page === 0 && styles.btnOff]} disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))}>
              <Ionicons name="chevron-back" size={18} color={COLORS.ink} />
              <Text style={styles.navText}>Back</Text>
            </Pressable>
            {isLast ? (
              <View style={styles.navSpacer} />
            ) : (
              <Pressable style={styles.nextBtn} onPress={() => setPage((p) => Math.min(total - 1, p + 1))}>
                <Text style={styles.nextText}>{page === 0 ? 'Begin' : 'Next'}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.bg} />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={contentsOpen} transparent animationType="slide" onRequestClose={() => setContentsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setContentsOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Contents</Text>
            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {PAGE_TITLES.map((t, i) => (
                <Pressable key={i} style={styles.tocRow} onPress={() => { setPage(i); setContentsOpen(false); }}>
                  <Text style={[styles.tocNum, i === page && styles.tocActive]}>{i + 1}</Text>
                  <Text style={[styles.tocTitle, i === page && styles.tocActive]} numberOfLines={1}>{t}</Text>
                  {i === page ? <Ionicons name="ellipse" size={8} color={COLORS.accent} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, paddingRight: 20 },
  backBar: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  pageCount: { fontSize: 13, color: COLORS.muted },
  progressTrack: { height: 3, backgroundColor: COLORS.line, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: COLORS.accent },
  loaderBox: { paddingVertical: 50, alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },
  paper: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, padding: 22 },
  centerBlock: { alignItems: 'center' },
  kicker: { fontSize: 12, letterSpacing: 2.5, color: COLORS.muted, marginBottom: 10 },
  partTag: { fontSize: 11, letterSpacing: 2, color: COLORS.accent, marginBottom: 14 },
  coverTitle: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, textAlign: 'center', marginTop: 4 },
  coverSub: { fontSize: 14, color: COLORS.accent, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  h2: { fontFamily: FONT_SERIF, fontSize: 23, lineHeight: 30, color: COLORS.ink, marginBottom: 14 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, marginBottom: 14 },
  quietNote: { fontSize: 13, lineHeight: 20, color: COLORS.muted, marginTop: 6, fontStyle: 'italic' },
  callout: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 25, color: COLORS.accent, marginBottom: 16 },
  illus: { alignItems: 'center', marginVertical: 10 },
  recap: { backgroundColor: COLORS.accentSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  recapLine: { fontSize: 13, lineHeight: 20, color: COLORS.ink, marginBottom: 4 },
  field: { marginBottom: 20 },
  fieldLabel: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 23, color: COLORS.ink, marginBottom: 6 },
  fieldHelper: { fontSize: 13, lineHeight: 19, color: COLORS.muted, marginBottom: 10 },
  input: { fontSize: 16, lineHeight: 26, color: COLORS.ink, minHeight: 80, paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  sliderRow: { marginTop: 6, marginBottom: 6 },
  sliderLabel: { fontSize: 14, color: COLORS.ink },
  sliderBody: { flexDirection: 'row', alignItems: 'center' },
  sliderValue: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.accent, width: 26, textAlign: 'right' },
  savedNote: { fontSize: 13, lineHeight: 20, color: COLORS.accent, marginTop: 4, marginBottom: 4 },
  saveBtn: { marginTop: 16, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  btnOff: { opacity: 0.45 },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.bg },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  navText: { fontSize: 14, color: COLORS.ink },
  navSpacer: { width: 100 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 13, paddingHorizontal: 26, borderRadius: 999, backgroundColor: COLORS.accent },
  nextText: { fontSize: 15, color: COLORS.bg, letterSpacing: 0.5 },
  note: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingHorizontal: 20 },
  contentsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: COLORS.accentSoft },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 14 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 8 },
  tocRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: COLORS.line },
  tocNum: { width: 22, fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  tocTitle: { flex: 1, fontSize: 15, color: COLORS.ink },
  tocActive: { color: COLORS.accent },

});
