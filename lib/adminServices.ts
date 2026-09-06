// Writing services from admin.
//
// Kept apart from lib/services, which reads them, so the reading path stays
// free of anything only an admin can do.
import { supabase } from './supabase';
import { reloadServices } from './services';

export type ServiceRow = {
  id: string;
  expert_id: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  duration_min: number | null;
  online: boolean;
  in_person: boolean;
  location: string | null;
  kind: 'single' | 'package';
  sessions_total: number | null;
  // Optional Arabic content, packed into the i18n jsonb column under ar.
  // When present it merges with any existing i18n keys so unrelated
  // languages (fr, fa) are not wiped.
  i18n?: any;
};

// An id that reads as what it is, since it appears in booking rows for years.
export function serviceSlug(expertId: string, name: string): string {
  const tail = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 34);
  return `${expertId}-${tail}`;
}

export async function saveService(row: ServiceRow): Promise<{ error: any }> {
  try {
    // After everything else of theirs, so a new one does not land in the
    // middle of a list someone has already ordered.
    const { data: last } = await supabase
      .from('services')
      .select('sort')
      .eq('expert_id', row.expert_id)
      .order('sort', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from('services').upsert(
      { ...row, sort: (last as any)?.sort != null ? (last as any).sort + 1 : 0 },
      { onConflict: 'id' },
    );
    if (!error) await reloadServices();
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}

export async function removeService(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) await reloadServices();
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}
