import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from "@/utils/supabase/env";
import type { Database } from './types';

const { url: supabaseUrl, key: supabaseAnonKey } = requireSupabaseEnv();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper to sign out
export async function signOut() {
  await supabase.auth.signOut();
}
