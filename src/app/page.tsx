"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { AppContent } from "@/components/AppContent";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [hasMetMinimumDelay, setHasMetMinimumDelay] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasMetMinimumDelay(true);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, []);

  const shouldShowLoadingScreen = isLoading || !hasMetMinimumDelay;
  const pageContent = !isLoading ? (user ? <AppContent /> : <LoginPage />) : null;

  return (
    <>
      {pageContent}
      <LoadingScreen isVisible={shouldShowLoadingScreen} />
    </>
  );
}
