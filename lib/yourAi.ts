// My Companion data layer. The route and Edge Function keep the your-ai name.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type AiMessage = { role: 'user' | 'assistant'; content: string };

export async function getHistory(userId: string): Promise<AiMessage[]> {
  const { data } = await supabase
    .from('ai_messages')
    .select('role,content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return (data as AiMessage[]) ?? [];
}

export type AiTurn = AiMessage & { created_at: string };
export type Conversation = { id: string; startedAt: string; messages: AiTurn[] };

// Two hours of silence reads as a new conversation. Grouping on the gap means
// no schema change and no touching the Edge Function that writes these rows.
const GAP_MS = 2 * 60 * 60 * 1000;

export async function getConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data } = await supabase
      .from('ai_messages')
      .select('role,content,created_at,thread_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    const turns = (data as AiTurn[]) ?? [];
    const out: Conversation[] = [];
    for (const t of turns) {
      const at = new Date(t.created_at).getTime();
      const last = out[out.length - 1];
      const lastAt = last ? new Date(last.messages[last.messages.length - 1].created_at).getTime() : 0;
      const tid = (t as any).thread_id ?? null;
      const lastTid = last ? (last.messages[last.messages.length - 1] as any).thread_id ?? null : undefined;
      // A real thread id decides it. Rows written before threads existed fall
      // back to the gap.
      const sameConversation = last && (tid ? tid === lastTid : lastTid == null && at - lastAt <= GAP_MS);
      if (!sameConversation) {
        out.push({ id: tid ?? t.created_at, startedAt: t.created_at, messages: [t] });
      } else {
        last.messages.push(t);
      }
    }
    return out.reverse(); // newest first
  } catch {
    return [];
  }
}

// The first thing they said, which describes a conversation better than a date.
// Removes a conversation for good. A threaded one goes by its thread. One
// written before threads existed goes by the span it covers, which is the same
// gap rule that grouped it, so it takes that conversation and no other.
export async function deleteConversation(userId: string, c: Conversation): Promise<boolean> {
  try {
    const tid = (c.messages[0] as any)?.thread_id ?? null;
    let q = supabase.from('ai_messages').delete().eq('user_id', userId);
    if (tid) {
      q = q.eq('thread_id', tid);
    } else {
      const first = c.messages[0]?.created_at;
      const last = c.messages[c.messages.length - 1]?.created_at;
      if (!first || !last) return false;
      q = q.is('thread_id', null).gte('created_at', first).lte('created_at', last);
    }
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}

export function conversationTitle(c: Conversation): string {
  const first = c.messages.find((m) => m.role === 'user');
  const text = (first?.content ?? '').trim();
  if (!text) return 'Conversation';
  return text.length > 60 ? text.slice(0, 60).trim() + '...' : text;
}

// A conversation id, made on the device when a conversation starts. Plain text
// rather than a uuid, since nothing joins on it.
export function newThreadId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export async function sendMessage(message: string, firstName?: string, threadId?: string): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('your-ai', {
    body: { message, firstName, threadId },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Something went wrong.' };
  return { ok: true, reply: data.reply };
}

// --- The live conversation ---
// Held here rather than in the screen, so moving to another tab does not end
// it. Module state lasts as long as the JavaScript context, which means it
// goes when the app is killed and not before.

export type CompanionSession = {
  messages: AiMessage[];
  threadId: string;
  readingPast: boolean;
};

let session: CompanionSession = { messages: [], threadId: newThreadId(), readingPast: false };
const sessionListeners = new Set<() => void>();
const emitSession = () => sessionListeners.forEach((l) => l());

export function setSession(patch: Partial<CompanionSession>) {
  session = { ...session, ...patch };
  emitSession();
}

// Takes a value or an updater, so the screen can keep appending the way it did.
export function setSessionMessages(next: AiMessage[] | ((prev: AiMessage[]) => AiMessage[])) {
  const value = typeof next === 'function' ? (next as (p: AiMessage[]) => AiMessage[])(session.messages) : next;
  session = { ...session, messages: value };
  emitSession();
}

export function startNewConversation() {
  session = { messages: [], threadId: newThreadId(), readingPast: false };
  emitSession();
}

// Snapshotted into state rather than read from the closure. The React Compiler
// will happily memoize a module variable at whatever it was on first render.
export function useCompanionSession(): CompanionSession {
  const [v, setV] = useState(session);
  useEffect(() => {
    const l = () => setV(session);
    sessionListeners.add(l);
    l();
    return () => { sessionListeners.delete(l); };
  }, []);
  return v;
}

export async function clearHistory(userId: string): Promise<void> {
  await supabase.from('ai_messages').delete().eq('user_id', userId);
}

