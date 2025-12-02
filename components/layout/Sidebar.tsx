"use client";

import { Link, usePathname } from "@/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Wallet, 
  Settings, 
  Rocket, 
  Archive,
  FileSignature
} from "lucide-react";
import { OrganizationSwitcher } from "./OrganizationSwitcher";

export function Sidebar() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard" as const, labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/projects" as const, labelKey: "projects", icon: Rocket },
    { href: "/customers" as const, labelKey: "customers", icon: Users },
    { href: "/proposals" as const, labelKey: "proposals", icon: FileText },
    { href: "/contracts" as const, labelKey: "contracts", icon: FileSignature },
    { href: "/finance" as const, labelKey: "finance", icon: Wallet },
    { href: "/archive" as const, labelKey: "archive", icon: Archive },
    { href: "/settings" as const, labelKey: "settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card/80 dark:bg-slate-950/50 backdrop-blur-xl hidden md:flex flex-col z-50">
      {/* LOGO ALANI */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <img src="/images/logo-light.png" alt="" className="dark:hidden h-8" />
          <img src="/images/logo-dark.png" alt="" className="hidden dark:block h-8" />
        </Link>
      </div>

      {/* ORGANİZASYON SEÇİCİ */}
      <div className="px-3 py-4 border-b border-border">
        <OrganizationSwitcher />
      </div>

      {/* MENÜ LİNKLERİ */}
      <nav className="flex-1 py-8 px-4 space-y-2">
        {menuItems.map((item) => {
          // Pathname'i kontrol et - hem tam eşleşme hem de alt route'lar için
          const isActive = pathname === item.href || pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="font-medium">{t(item.labelKey)}</span>
              
              {/* Aktif İndikatörü (Glow Dot) */}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary dark:shadow-[0_0_10px_#60a5fa]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ALT BİLGİ */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted/50 dark:bg-slate-900/50 rounded-xl p-4 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Sistem Durumu</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}