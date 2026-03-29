"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { AppContent } from "@/components/AppContent";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-stage relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="glass-panel flex flex-col items-center gap-4 rounded-[2rem] px-10 py-9">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-[#ff5f6d]" />
          <p className="text-sm text-slate-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show main app content if authenticated
  return <AppContent />;
}
