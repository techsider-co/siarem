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

export function Sidebar() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();

  const menuItems = [
    { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/projects", labelKey: "projects", icon: Rocket },
    { href: "/customers", labelKey: "customers", icon: Users },
    { href: "/proposals", labelKey: "proposals", icon: FileText },
    { href: "/contracts", labelKey: "contracts", icon: FileSignature },
    { href: "/finance", labelKey: "finance", icon: Wallet },
    { href: "/archive", labelKey: "archive", icon: Archive },
    { href: "/settings", labelKey: "settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl hidden md:flex flex-col z-50">
      {/* LOGO ALANI */}
      <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          {/* <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-100">
            unalisi<span className="text-blue-500">.os</span>
          </span> */}
          <img src="/images/logo-dark.png" alt="" />
        </Link>
      </div>

      {/* MENÜ LİNKLERİ */}
      <nav className="flex-1 py-8 px-4 space-y-2">
        {menuItems.map((item) => {
          // Pathname'i kontrol et - hem tam eşleşme hem de alt route'lar için
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
              <span className="font-medium">{t(item.labelKey)}</span>
              
              {/* Aktif İndikatörü (Glow Dot) */}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ALT BİLGİ */}
      <div className="p-4 border-t border-slate-800/50">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <div className="text-xs text-slate-500 mb-1">Sistem Durumu</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-400">Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}