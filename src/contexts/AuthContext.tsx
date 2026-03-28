"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type Role = "sector_commander" | "team_leader" | "scout" | "medic";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "1",
    name: "أحمد الغامدي",
    email: "admin@ambulance650.com",
    password: "admin123",
    role: "sector_commander",
  },
  {
    id: "2",
    name: "محمد الشمري",
    email: "leader@ambulance650.com",
    password: "leader123",
    role: "team_leader",
  },
  {
    id: "3",
    name: "علي العتيبي",
    email: "scout@ambulance650.com",
    password: "scout123",
    role: "scout",
  },
  {
    id: "4",
    name: "خالد القرني",
    email: "medic@ambulance650.com",
    password: "medic123",
    role: "medic",
  },
  {
    id: "5",
    name: "سعد السبيعي",
    email: "user1@ambulance650.com",
    password: "user123",
    role: "team_leader",
  },
  {
    id: "6",
    name: "فهد الزهراني",
    email: "user2@ambulance650.com",
    password: "user123",
    role: "scout",
  },
  {
    id: "7",
    name: "عبدالله المطيري",
    email: "user3@ambulance650.com",
    password: "user123",
    role: "medic",
  },
  {
    id: "8",
    name: "عبدالرحمن الدوسري",
    email: "user4@ambulance650.com",
    password: "user123",
    role: "sector_commander",
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from localStorage on first render
    if (typeof window === "undefined") return null;
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        localStorage.removeItem("currentUser");
      }
    }
    return null;
  });

  // Loading is only true during SSR, false on client
  const isLoading = typeof window === "undefined";

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const foundUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("currentUser", JSON.stringify(userWithoutPassword));
      return { success: true };
    }

    return { success: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("currentUser");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
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

// Export mock users for other parts of the app
export { MOCK_USERS };
