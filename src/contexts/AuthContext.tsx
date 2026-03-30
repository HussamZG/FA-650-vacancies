"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
  initialAuthResolved?: boolean;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialAuthResolved = false,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialAuthResolved);

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
    const loadCurrentUser = async () => {
      try {
        await loadCurrentUserFromApp();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (!initialAuthResolved) {
      void loadCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [initialAuthResolved, loadCurrentUserFromApp]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
      }

      if (data.user) {
        setUser(data.user);
        return { success: true };
      }

      const loaded = await loadCurrentUserFromApp();
      return loaded
        ? { success: true }
        : { success: false, error: "تم تسجيل الدخول لكن تعذر تحميل ملف المستخدم" };
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
        const response = await fetch("/api/auth", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            email,
            password,
            role,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          return { success: false, error: data.error || "تعذر إنشاء الحساب" };
        }

        if (data.user) {
          setUser(data.user);
        }

        return {
          success: true,
          message: data.message || "تم إنشاء الحساب بنجاح",
        };
      } catch {
        return { success: false, error: "تعذر الاتصال بالخادم" };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth", {
        method: "DELETE",
        credentials: "include",
      });
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
