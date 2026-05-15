/**
 * lib/supabase/habits.ts
 *
 * Phase 2.1 — Supabase-backed CRUD for the `habits` and `habit_logs` tables.
 *
 * Habit model:
 *   • One active habit per user, enforced by a partial unique index in DB.
 *   • archived_at NULL → active, non-NULL → archived (preserved for stats).
 *   • Each habit can have many habit_logs (one per day per habit, also
 *     enforced by a DB unique constraint).
 *
 * The component-facing shape mirrors the legacy localStorage interfaces so
 * existing UI code can stay mostly unchanged.
 */

import { supabase } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type HabitPlanType = 'time_daily' | 'rows_daily' | 'days_per_week';

export interface HabitPlan {
  type: HabitPlanType;
  target: number;
}

export interface SupabaseHabit {
  id: string;
  user_id: string;
  plan_type: HabitPlanType;
  plan_target: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseHabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  status: 'done' | 'missed';
  created_at: string;
}

/**
 * Component-facing shape matching the legacy localStorage `activeHabit` object.
 */
export interface ActiveHabit {
  habitId: string;
  plan: HabitPlan;
  createdAt: string; // YYYY-MM-DD
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: 'done' | 'missed';
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{ id: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user;
}

// ── Row mapping ──────────────────────────────────────────────────────────────

function rowToActiveHabit(row: SupabaseHabit): ActiveHabit {
  return {
    habitId: row.id,
    plan: { type: row.plan_type, target: row.plan_target },
    createdAt: row.created_at.split('T')[0],
  };
}

function rowToHabitLog(row: SupabaseHabitLog): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.log_date,
    status: row.status,
  };
}

// ── Habit reads ───────────────────────────────────────────────────────────────

/**
 * Returns the current user's active (non-archived) habit, or null if none.
 */
export async function getActiveHabit(): Promise<ActiveHabit | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userData.user.id)
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToActiveHabit(data as SupabaseHabit);
}

// ── Habit writes ──────────────────────────────────────────────────────────────

/**
 * Create a new habit. The DB partial unique index will reject if the user
 * already has an active habit — call archiveHabit() on the old one first.
 */
export async function createHabit(plan: HabitPlan): Promise<ActiveHabit> {
  const authUser = await getAuthUser();

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: authUser.id,
      plan_type: plan.type,
      plan_target: plan.target,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToActiveHabit(data as SupabaseHabit);
}

/**
 * Update the plan on an existing habit. Use this to edit while keeping the
 * same habit_id (so habit_logs continue to attach).
 */
export async function updateHabitPlan(
  habitId: string,
  plan: HabitPlan,
): Promise<ActiveHabit> {
  const authUser = await getAuthUser();

  const { data, error } = await supabase
    .from('habits')
    .update({
      plan_type: plan.type,
      plan_target: plan.target,
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId)
    .eq('user_id', authUser.id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToActiveHabit(data as SupabaseHabit);
}

/**
 * Soft-archive the habit (sets archived_at = now()). Logs are preserved so
 * stats remain queryable.
 */
export async function archiveHabit(habitId: string): Promise<void> {
  const authUser = await getAuthUser();

  const { error } = await supabase
    .from('habits')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId)
    .eq('user_id', authUser.id);

  if (error) throw error;
}

/**
 * Upsert helper: if the user has an active habit, update its plan; otherwise
 * create a new one. Matches the existing habits/setup page semantics.
 */
export async function upsertActiveHabit(plan: HabitPlan): Promise<ActiveHabit> {
  const existing = await getActiveHabit();
  if (existing) {
    return updateHabitPlan(existing.habitId, plan);
  }
  return createHabit(plan);
}

// ── Habit log reads ──────────────────────────────────────────────────────────

/**
 * Returns all habit logs for the current user (across all habits, including
 * archived ones — so stats like best streak remain accurate over time).
 */
export async function getAllHabitLogs(): Promise<HabitLog[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (data as SupabaseHabitLog[]).map(rowToHabitLog);
}

/**
 * Returns habit logs for a specific habit, newest day first.
 */
export async function getHabitLogs(habitId: string): Promise<HabitLog[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('habit_id', habitId)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (data as SupabaseHabitLog[]).map(rowToHabitLog);
}

// ── Habit log writes ─────────────────────────────────────────────────────────

/**
 * Create or upsert a habit log entry for a specific date.
 * Uses ON CONFLICT (habit_id, log_date) so calling this on a day that already
 * has a log will update its status rather than fail.
 */
export async function upsertHabitLog(data: {
  habitId: string;
  date: string; // YYYY-MM-DD
  status: 'done' | 'missed';
}): Promise<HabitLog> {
  const authUser = await getAuthUser();

  const { data: inserted, error } = await supabase
    .from('habit_logs')
    .upsert(
      {
        habit_id: data.habitId,
        user_id: authUser.id,
        log_date: data.date,
        status: data.status,
      },
      { onConflict: 'habit_id,log_date' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return rowToHabitLog(inserted as SupabaseHabitLog);
}
