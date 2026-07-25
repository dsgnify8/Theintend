// "Your AI" companion data layer.
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

