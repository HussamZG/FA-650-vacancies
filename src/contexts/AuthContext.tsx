"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import type { AppRole } from "@/lib/user-access";

export type Role = AppRole;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isAdmin: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: Role
  ) => Promise<{ success: boolean; error?: string; message?: string; shouldGoToLogin?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentUserFromApp = useCallback(async () => {
    try {
      const response = await fetch("/api/auth", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        setUser(null);
        return false;
      }

      setUser(data.user);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        await loadCurrentUserFromApp();
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadCurrentUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadCurrentUserFromApp]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const message = error.message.toLowerCase();

        if (message.includes("email not confirmed")) {
          return { success: false, error: "الحساب غير مفعّل بعد. أكمل التفعيل ثم أعد المحاولة." };
        }

        if (message.includes("invalid login credentials")) {
          return { success: false, error: "بيانات الدخول غير صحيحة." };
        }

        return { success: false, error: error.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
      }

      const loaded = await loadCurrentUserFromApp();
      if (loaded) {
        return { success: true };
      }

      return { success: false, error: "تم تسجيل الدخول لكن تعذر تحميل ملف المستخدم" };
    } catch {
      return { success: false, error: "تعذر الاتصال بالخادم" };
    } finally {
      setIsLoading(false);
    }
  }, [loadCurrentUserFromApp]);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: Role = "medic"
    ): Promise<{ success: boolean; error?: string; message?: string; shouldGoToLogin?: boolean }> => {
      setIsLoading(true);

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes("already registered")) {
            return { success: false, error: "هذا البريد الإلكتروني مسجل مسبقاً. جرّب تسجيل الدخول." };
          }

          return { success: false, error: error.message || "تعذر إنشاء الحساب" };
        }

        if (!data.session) {
          return {
            success: true,
            message: "تم إنشاء الحساب بنجاح. أكمل التفعيل إن طُلب منك ذلك ثم سجّل الدخول.",
            shouldGoToLogin: true,
          };
        }

        if (data.user?.id && data.user.email) {
          await loadCurrentUserFromApp();
        }

        return { success: true, message: "تم إنشاء الحساب بنجاح" };
      } catch {
        return { success: false, error: "تعذر الاتصال بالخادم" };
      } finally {
        setIsLoading(false);
      }
    },
    [loadCurrentUserFromApp]
  );

  const logout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // تجاهل الخطأ محلياً لأننا سننهي الجلسة على الواجهة بكل الأحوال
    }

    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadCurrentUserFromApp();
  }, [loadCurrentUserFromApp]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
