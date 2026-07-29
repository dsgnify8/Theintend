// My Companion data layer. The route and Edge Function keep the your-ai name.
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

export async function clearHistory(userId: string): Promise<void> {
  await supabase.from('ai_messages').delete().eq('user_id', userId);
}

