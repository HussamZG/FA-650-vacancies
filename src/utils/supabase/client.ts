import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "@/utils/supabase/env";

export const createClient = () => {
  const { url, key } = requireSupabaseEnv();

  return createBrowserClient(url, key);
};
