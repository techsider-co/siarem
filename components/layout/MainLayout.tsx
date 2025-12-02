"use client";

import { usePathname } from "@/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { StarBackground } from "@/components/ui/StarBackground";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Login sayfası, landing page ve preview sayfaları fullscreen olmalı
  // Locale prefix'li login path'lerini kontrol et
  const isFullScreenPage =
    pathname === '/' ||
    pathname?.endsWith('/') ||
    pathname?.includes('/login') || 
    pathname?.includes('/giris-yap') || 
    pathname?.includes('/anmeldung') ||
    pathname?.startsWith('/preview');

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* 1. HAREKETLİ YILDIZLAR (TÜM SAYFALARDA) */}
      <StarBackground />

      {/* 2. NEBULA EFEKTLERİ (SABİT) */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] animate-pulse"
          style={{ animationDuration: "12s" }}
        />
      </div>

      {/* 3. İÇERİK */}
      {!isFullScreenPage && <Sidebar />}

      <main
        className={`flex-1 relative z-10 transition-all duration-300 ${
          !isFullScreenPage ? "md:ml-64" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
