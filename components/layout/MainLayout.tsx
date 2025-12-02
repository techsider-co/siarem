"use client";

import { usePathname } from "@/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { StarBackground } from "@/components/ui/StarBackground";
import { PendingInvitations } from "@/components/layout/PendingInvitations";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Landing page için kontrol - root path'te
  const isLandingPage = pathname === '/';
  
  // Login, Register sayfaları ve preview sayfaları fullscreen olmalı
  const isFullScreenPage =
    isLandingPage ||
    pathname?.includes('/login') || 
    pathname?.includes('/giris-yap') || 
    pathname?.includes('/anmeldung') ||
    pathname?.includes('/register') || 
    pathname?.includes('/kayit-ol') || 
    pathname?.includes('/registrieren') ||
    pathname?.startsWith('/preview');

  // Landing page için tamamen farklı bir render
  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-background">
      {/* 1. HAREKETLİ YILDIZLAR (Dashboard sayfalarında - sadece dark mode) */}
      {!isFullScreenPage && <StarBackground />}

      {/* 2. ARKA PLAN EFEKTLERİ (Dashboard sayfalarında) */}
      {!isFullScreenPage && (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
          {/* Light Mode: Soft gradient orbs */}
          <div
            className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 dark:bg-blue-600/10 rounded-full blur-[150px] animate-pulse"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/5 dark:bg-purple-600/10 rounded-full blur-[150px] animate-pulse"
            style={{ animationDuration: "12s" }}
          />
          {/* Light mode grid pattern */}
          <div 
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
        </div>
      )}

      {/* 3. İÇERİK */}
      {!isFullScreenPage && <Sidebar />}

      <main
        className={`flex-1 relative z-10 transition-all duration-300 ${
          !isFullScreenPage ? "md:ml-64" : ""
        }`}
      >
        {children}
      </main>

      {/* Bekleyen Davetler Modal - Sadece dashboard sayfalarında */}
      {!isFullScreenPage && <PendingInvitations />}
    </div>
  );
}
