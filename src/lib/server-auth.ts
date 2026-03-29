import { createClient } from "@/utils/supabase/server";
import {
  getDefaultAppRole,
  type AppRole,
} from "@/lib/user-access";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  isAdmin: boolean;
}

function getDefaultName(email: string | undefined) {
  if (!email) return "مستخدم جديد";
  return email.split("@")[0];
}

async function upsertCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id || !authUser.email) {
    return null;
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("User")
    .select("id, name, email, role, isActive, isAdmin")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message || "تعذر تحميل ملف المستخدم الحالي");
  }

  const profile = {
    id: authUser.id,
    name: authUser.user_metadata?.name || getDefaultName(authUser.email),
    email: authUser.email,
    password: "supabase-auth",
    role: getDefaultAppRole(authUser.user_metadata?.role),
    isActive: existingProfile?.isActive ?? true,
    isAdmin: existingProfile?.isAdmin ?? Boolean(authUser.user_metadata?.is_admin),
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("User")
    .upsert(profile, { onConflict: "id" });

  if (error) {
    throw new Error(error.message || "تعذر مزامنة ملف المستخدم");
  }

  return profile;
}

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const profile = await upsertCurrentUserProfile();

  if (!profile || !profile.isActive) {
    return null;
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    isActive: profile.isActive,
    isAdmin: profile.isAdmin,
  };
}

export async function ensureCurrentAppUserProfile(): Promise<AppUser | null> {
  const profile = await upsertCurrentUserProfile();

  if (!profile || !profile.isActive) {
    return null;
  }

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    isActive: profile.isActive,
    isAdmin: profile.isAdmin,
  };
}

export async function requireCurrentAppUser() {
  const user = await getCurrentAppUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentAppUser();

  if (!user.isAdmin) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
