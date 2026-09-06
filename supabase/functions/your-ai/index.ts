// your-ai: the companion. Loads this conversation only, with earlier ones as themes,
// the live expert roster, builds the system prompt, calls Claude, stores the turn.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_PROMPT, MODULES, OPENING } from './prompt.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

const STOP_WORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'for', 'not', 'but', 'you', 'your', 'are',
  'was', 'have', 'has', 'had', 'she', 'her', 'him', 'his', 'they', 'them', 'what',
  'when', 'why', 'how', 'can', 'could', 'would', 'should', 'about', 'from', 'just',
  'like', 'been', 'were', 'them', 'there', 'then', 'than', 'into', 'more', 'some',
  'very', 'really', 'feel', 'feels', 'feeling', 'know', 'think', 'want', 'get',
]);

function words(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

// Score a source against what the person said. Keywords are the strongest
// signal because they are chosen deliberately, topic next, then the written
// concepts. A lower authority level breaks ties, so guidance beats reflection.
function scoreSource(src: any, said: string[]): number {
  if (!said.length) return 0;
  const set = new Set(said);
  let score = 0;
  for (const k of (src.keywords ?? [])) {
    for (const w of words(k)) if (set.has(w)) score += 5;
  }
  for (const w of words(src.topic)) if (set.has(w)) score += 3;
  for (const w of words(src.subtopic)) if (set.has(w)) score += 2;
  for (const w of words(src.main_concepts)) if (set.has(w)) score += 1;
  return score;
}

function renderSource(src: any): string {
  const lines = [
    `SOURCE: ${src.title}${src.author ? `, ${src.author}` : ''}`,
    `Authority level ${src.authority_level} of 8. ${src.category}.`,
  ];
  if (src.main_concepts) lines.push(`What it holds: ${src.main_concepts}`);
  if (src.key_recommendations) lines.push(`What it recommends: ${src.key_recommendations}`);
  if (src.may_use) lines.push(`You may use it for: ${src.may_use}`);
  if (src.must_not_conclude) lines.push(`You must not conclude: ${src.must_not_conclude}`);
  if (src.limitations) lines.push(`Limits: ${src.limitations}`);
  if (src.referral_triggers) lines.push(`Points toward a professional: ${src.referral_triggers}`);
  return lines.join('\n');
}

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
    const message = String(body.message ?? '').trim();
    const firstName = String(body.firstName ?? '').trim();
    const threadId = String(body.threadId ?? '').trim() || null;
    if (!message) return json({ error: 'empty' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // live expert roster
    const { data: experts } = await admin
      .from('ai_experts').select('name,modality,best_for').eq('active', true).order('sort');
    const roster = (experts ?? [])
      .map((e: any) => `- ${e.name}, ${e.modality}. ${e.best_for}`)
      .join('\n');

    // This conversation only. Everything before it informs the companion
    // through the system prompt instead of being replayed as messages, so a
    // new conversation starts clean without the companion losing the person.
    let threadQuery = admin
      .from('ai_messages').select('role,content')
      .eq('user_id', userId).order('created_at', { ascending: true });
    threadQuery = threadId ? threadQuery.eq('thread_id', threadId) : threadQuery.is('thread_id', null);
    const { data: history } = await threadQuery;
    const msgs = (history ?? []).map((m: any) => ({ role: m.role, content: m.content }));
    const isNewConversation = msgs.length === 0;
    msgs.push({ role: 'user', content: message });

    // What they have raised before, in their own words, so patterns stay
    // visible across conversations. Their turns only, and capped.
    const { data: earlier } = await admin
      .from('ai_messages').select('content,thread_id')
      .eq('user_id', userId).eq('role', 'user')
      .order('created_at', { ascending: false }).limit(60);
    const priorThemes = (earlier ?? [])
      .filter((m: any) => (m.thread_id ?? null) !== threadId)
      .slice(0, 20)
      .map((m: any) => String(m.content).replace(/\s+/g, ' ').slice(0, 180))
      .reverse();

    const context = `THE INTEND'S EXPERTS (match by fit, never by default):\n${roster || '(none listed)'}`
      + (firstName ? `\n\nThis person's name is ${firstName}. Use it naturally, not in every message.` : '')
      + (priorThemes.length
          ? `\n\nWHAT THEY HAVE BROUGHT BEFORE (earlier conversations, oldest first). Use this to understand them and to notice patterns. Do not quote it back or open by referring to it:\n`
            + priorThemes.map((t: string) => `- ${t}`).join('\n')
          : '')
      + (isNewConversation ? OPENING : '');

    // Modules that this conversation calls for. Scored against the whole
    // thread, since a parent several messages in may only say "he did it again".
    // Tokenised without the length filter that words() applies, because short
    // keywords like son, kid, mum and dad would otherwise never match.
    const conversationText = msgs.map((m: any) => m.content).join(' ');
    const convWords = new Set(
      conversationText.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
    );
    const moduleBlock = MODULES
      .filter((mod) => mod.keywords.some((k) => convWords.has(k)))
      .map((mod) => mod.text)
      .join('\n\n');

    // Sources that actually bear on what they said. Approved and active only.
    let sourceBlock = '';
    try {
      const said = words(message);
      if (said.length) {
        const { data: sources } = await admin
          .from('ai_sources')
          .select('title,author,topic,subtopic,keywords,authority_level,category,main_concepts,key_recommendations,limitations,may_use,must_not_conclude,referral_triggers')
          .eq('active', true).eq('approved', true);
        const ranked = (sources ?? [])
          .map((src: any) => ({ src, score: scoreSource(src, said) }))
          .filter((x: any) => x.score >= 5)
          .sort((a: any, b: any) =>
            b.score - a.score || a.src.authority_level - b.src.authority_level)
          .slice(0, 4);
        if (ranked.length) {
          sourceBlock = '\n\nSOURCES FOR THIS CONVERSATION. Follow these. A must not conclude line is a hard limit.\n\n'
            + ranked.map((x: any) => renderSource(x.src)).join('\n\n');
        }
      }
    } catch {
      // A registry problem must never stop someone getting a reply.
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        // The long part is identical on every call, so it is cached. Only the
        // per person context is charged in full each time.
        system: [
          { type: 'text', text: BASE_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: (moduleBlock ? moduleBlock + '\n\n' : '') + context + sourceBlock },
        ],
        messages: msgs,
      }),
    });
    if (!r.ok) return json({ error: `ai ${r.status}` }, 502);
    const d = await r.json();
    let reply = (d.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim();
    // Strip em and en dashes as before. When the response is in Arabic, swap
    // for the Arabic comma so the punctuation matches the script; English
    // comma inside otherwise-Arabic text reads jarringly.
    const isArabicReply = /[\u0600-\u06FF]/.test(reply);
    reply = reply.replace(/[\u2013\u2014]/g, isArabicReply ? '،' : ',');
    if (!reply) return json({ error: 'no_reply' }, 502);

    // store both turns
    await admin.from('ai_messages').insert([
      { user_id: userId, role: 'user', content: message, thread_id: threadId },
      { user_id: userId, role: 'assistant', content: reply, thread_id: threadId },
    ]);

    return json({ ok: true, reply });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});

