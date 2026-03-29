import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/utils/supabase/env";

export const createClient = async () => {
  const cookieStore = await cookies();
  const { url, key } = requireSupabaseEnv();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // قد يتم استدعاء setAll من Server Component.
            // في هذه الحالة يعتمد تحديث الجلسة على middleware.
          }
        },
      },
    },
  );
};
