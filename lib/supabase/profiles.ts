import { supabase } from '@/lib/supabase/client';

export interface SupabaseProfile {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  nickname: string | null;      // aliased from display_name via PostgREST
  about: string | null;
  avatar_id: string | null;
  avatar_color: string | null;
  avatar_emoji: string | null;
  craft_interests: string[] | null;
}

export interface SupabaseProfileUpdate {
  display_name?: string | null;   // DB column name — maps to the nickname field
  about?: string | null;
  avatar_id?: string | null;
  avatar_color?: string | null;
  avatar_emoji?: string | null;
  craft_interests?: string[] | null;
}

// PostgREST alias: nickname:display_name returns { nickname: '...' } without a DB migration
const PROFILE_COLUMNS =
  'id, created_at, updated_at, nickname:display_name, about, avatar_id, avatar_color, avatar_emoji, craft_interests';

/**
 * Fetch the profile row for a given auth user ID.
 * Returns null if the row does not exist yet.
 */
export async function getSupabaseProfile(userId: string): Promise<SupabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`getSupabaseProfile: ${error.message}`);
  }

  return data as SupabaseProfile | null;
}

/**
 * Ensure a profile row exists for the given auth user ID.
 * Creates a minimal row if one does not exist yet.
 * Never overwrites existing profile data.
 */
export async function ensureSupabaseProfile(userId: string): Promise<SupabaseProfile | null> {
  const existing = await getSupabaseProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    // Unique-violation (23505): a concurrent request created the row between
    // our getSupabaseProfile check and this insert — fetch what is there now.
    if (error.code === '23505') {
      return getSupabaseProfile(userId);
    }
    throw new Error(`ensureSupabaseProfile: ${error.message}`);
  }

  return data as SupabaseProfile;
}

/**
 * Create or update the profile row for the given auth user ID.
 * Only the fields present in `updates` are written.
 * Sets updated_at to the current timestamp on every call.
 */
export async function upsertSupabaseProfile(
  userId: string,
  updates: SupabaseProfileUpdate,
): Promise<SupabaseProfile | null> {
  const payload = {
    id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(`upsertSupabaseProfile: ${error.message}`);
  }

  return data as SupabaseProfile;
}
