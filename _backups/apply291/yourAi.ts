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
      .select('role,content,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    const turns = (data as AiTurn[]) ?? [];
    const out: Conversation[] = [];
    for (const t of turns) {
      const at = new Date(t.created_at).getTime();
      const last = out[out.length - 1];
      const lastAt = last ? new Date(last.messages[last.messages.length - 1].created_at).getTime() : 0;
      if (!last || at - lastAt > GAP_MS) {
        out.push({ id: t.created_at, startedAt: t.created_at, messages: [t] });
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

export async function sendMessage(message: string, firstName?: string): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('your-ai', {
    body: { message, firstName },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Something went wrong.' };
  return { ok: true, reply: data.reply };
}

export async function clearHistory(userId: string): Promise<void> {
  await supabase.from('ai_messages').delete().eq('user_id', userId);
}

