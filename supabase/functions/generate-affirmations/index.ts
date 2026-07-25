// generate-affirmations: makes a batch of first-person affirmations for the
// signed-in user, tuned to their onboarding answers and chosen category. Voice
// is elevated and embodied (in the spirit of Louise Hay and Joe Dispenza):
// certainty, becoming, worthiness, gratitude as already-true. Never consolation.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

// Each category leans a direction, but all sit high, not low.
const TONE: Record<string, string> = {
  gentle:
    'Tender and rising. Softness reframed as power and truth, never as fragility. Reassurance that lifts, never pity. Feel: "My softness is my strength.", "I am seen even when I am not perfect.", "I do not have to earn love by being impressive."',
  grounded:
    'Clear, embodied, certain. The future felt as already present. Release of old beliefs, trust in the path. Feel: "I release the beliefs that held me back.", "Everything is always working out for me.", "I move through my day with a calm, certain mind."',
  empowering:
    'Bold, radiant, alive. Desire and worthiness stated plainly, success and abundance claimed. Feel: "I see myself living in abundance and I make it happen.", "I have a spark in my eyes and I live freely.", "I am worthy of the life I am building."',
  money:
    'Playful, magnetic, expectant, prosperous. Money as a natural, easy, constant flow; wealth claimed as normal and deserved. Gratitude and delight, never desperation. Some may be curious questions like "Why is money always flowing to me?". Feel: "I am a money magnet and wealth flows to me effortlessly.", "My bank account is always growing.", "Every dollar I spend comes back to me multiplied.", "I am worthy of receiving unlimited abundance.", "Having wealth is normal for me."',
};

const SYSTEM = `You write first-person affirmations for a wellness app called The Intend.
The voice is elevated and embodied, in the spirit of Louise Hay and Joe Dispenza. Someone should read one and feel their state lift, feel they are already becoming the person they want to be.

Voice, follow all:
- Speak from certainty and worthiness, as if the desired reality is already true. Present tense.
- Uplifting and alive. The reader should feel powerful, radiant, hopeful, grateful, capable.
- Where a feeling is tender (softness, being lost, needing love), REFRAME it as strength or truth. Never console, never pity, never position the reader as fragile, healing-in-progress, or making do.
- Draw on: becoming and receiving, releasing old beliefs, gratitude as already-true, self-worth as a birthright, claiming success and abundance, trusting the path.
- First person. Most begin with "I am", "I", "My", or "I release / I receive / I claim". Vary the openings.
- One sentence each, roughly 4 to 12 words, so it sits large and beautiful on a screen.
- No spiritual cliches like "the universe" or "manifest". No clinical or therapy language.
- No hedging or low-ceiling words: avoid "allowed to", "learning to", "trying", "a little", "slowly". Never use "enough" in any form ("I am enough", "I have enough"); it quietly implies lack. Speak from fullness and abundance instead.
- Never use the word "broken". Never use em dashes or any dashes.
- No quotes, no numbering, no hashtags, no emojis.
- Return ONLY a JSON array of strings.

Bad (too low, consoling): "I am allowed to rest." / "I am learning and that is enough." / "I give myself permission to go slowly."
Good (elevated, embodied): "My softness is my strength and it fuels my success." / "Everything is always working out for me." / "I see myself living in abundance and I make it happen." / "I release the old beliefs that held me back." / "I have a spark in my eyes and I live freely."
Good (money): "I am a money magnet and wealth flows to me effortlessly." / "My bank account is always growing." / "Every dollar I spend comes back to me multiplied." / "Having wealth is normal for me." / "Why is money always flowing into my life?"`;

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const uc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await uc.auth.getUser();
    if (!u?.user) return json({ error: 'sign_in_required' }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? 'self-love');
    const count = Math.min(Math.max(Number(body.count ?? 30), 10), 40);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: cat }, { data: prof }] = await Promise.all([
      admin.from('affirmation_categories').select('label,tone').eq('id', category).maybeSingle(),
      admin.from('affirmation_profile').select('focus_areas,context,state').eq('user_id', userId).maybeSingle(),
    ]);
    const toneKey = category === 'abundance' ? 'money' : (cat?.tone ?? 'empowering');
    const tone = TONE[toneKey] ?? TONE.empowering;
    const label = cat?.label ?? 'Self-love';
    const STATE: Record<string, string> = {
      loved: 'They want to feel loved and seen. Reframe softness and worthiness as strength; warm and rising.',
      confidence: 'They want confidence and self-belief. Bold, certain, self-possessed.',
      abundance: 'They want money and abundance. Use the playful, magnetic money voice: wealth flowing easily and constantly, being a money magnet, gratitude and delight, claimed as normal and deserved.',
      calm: 'They want calm and steadiness. Certain and settled, a mind at ease, the future felt as already safe.',
      release: 'They want to release what holds them back. Clearing old beliefs, stepping into the new self.',
      alive: 'They want to feel free and alive. Joyful, expansive, full of spark.',
    };
    const stateNote = STATE[prof?.state ?? ''] ?? '';
    const focus = (prof?.focus_areas ?? []).join(', ');
    const context = prof?.context ?? '';

    const user = `Category: ${label}
Tone for this category: ${tone}
${focus ? `This person is reaching for: ${focus}.` : ''}
${stateNote ? `Where they are right now: ${stateNote}` : ''}
${context ? `In their words: "${context}".` : ''}
Write ${count} elevated, embodied affirmations for the "${label}" category, shaped by what this person is reaching for. Make them feel amazing to read. Return only the JSON array.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!r.ok) return json({ error: `ai ${r.status}` }, 502);
    const d = await r.json();
    const raw = (d.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');

    let list: string[] = [];
    try {
      const m = raw.match(/\[[\s\S]*\]/);
      list = JSON.parse(m ? m[0] : raw);
    } catch {
      list = raw.split('\n').map((x: string) => x.replace(/^[\s\-\d."]+|["]+$/g, '').trim()).filter(Boolean);
    }

    const BANNED = /\b(broken|enough|allowed to|permission to|learning to|trying to|making do|go slowly|little by little)\b/i;
    list = list
      .map((t) => String(t).replace(/[\u2013\u2014]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((t) => t && !BANNED.test(t))
      .slice(0, count);

    if (!list.length) return json({ error: 'no_affirmations' }, 502);

    const rows = list.map((text) => ({ user_id: userId, category, text }));
    const { error } = await admin.from('affirmations').insert(rows);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, count: rows.length, category });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
