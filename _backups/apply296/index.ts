// your-ai: the companion. Loads this conversation only, with earlier ones as themes,
// the live expert roster, builds the system prompt, calls Claude, stores the turn.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BASE_PROMPT, OPENING } from './prompt.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

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
          { type: 'text', text: context },
        ],
        messages: msgs,
      }),
    });
    if (!r.ok) return json({ error: `ai ${r.status}` }, 502);
    const d = await r.json();
    let reply = (d.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim();
    reply = reply.replace(/[\u2013\u2014]/g, ',');
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

