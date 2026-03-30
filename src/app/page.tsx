"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { LoadingScreen } from "@/components/LoadingScreen";

const AppContent = dynamic(
  () => import("@/components/AppContent").then((module) => module.AppContent),
  {
    loading: () => null,
  }
);

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const pageContent = user ? <AppContent /> : <LoginPage />;

  return (
    <>
      {pageContent}
      <LoadingScreen isVisible={isLoading} />
    </>
  );
}
