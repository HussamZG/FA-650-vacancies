const missingSupabaseEnvMessage =
  "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
};

export const requireSupabaseEnv = () => {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    throw new Error(missingSupabaseEnvMessage);
  }

  return { url, key };
};
