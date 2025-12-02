// app/[locale]/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { ArrowRight, Zap, ShieldCheck, Bot, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const t = useTranslations("Landing");

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-hidden">
      {/* NAVBAR */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span>
              unalisi<span className="text-blue-500">.os</span>
            </span>
          </div>

          <div className="flex gap-4">
            {/* Linkler bizim navigation.ts'den geliyor, dile göre otomatik /tr/giris-yap veya /en/login olur */}
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/5"
              >
                {t("cta_login")}
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border-0">
                {t("cta_start")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10" />

        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Unalisi OS v3.0 Global Release
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            {t("hero_title")}
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("hero_subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-white text-black hover:bg-slate-200 border-0 rounded-full"
              >
                {t("cta_start")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* DASHBOARD PREVIEW MOCKUP */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-xl border border-slate-800 bg-slate-950/50 shadow-2xl overflow-hidden group">
            <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
            {/* Buraya dashboard ekran görüntünü koyabilirsin */}
            <div className="aspect-video bg-slate-900/50 flex items-center justify-center text-slate-600">
              [Dashboard Ekran Görüntüsü]
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Bot}
            title="AI Powered"
            desc="GPT-4 ile otomatik teklif oluşturma."
            color="blue"
          />
          <FeatureCard
            icon={BarChart3}
            title="Finansal Takip"
            desc="Gelir, gider ve ciro analizi."
            color="purple"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Enterprise Security"
            desc="Güvenli sözleşme ve veri yönetimi."
            color="green"
          />
        </div>
      </section>
    </div>
  );
}

// Basit Kart Bileşeni
function FeatureCard({ icon: Icon, title, desc, color }: any) {
  const colors: any = {
    blue: "text-blue-400 bg-blue-900/20 border-blue-500/20",
    purple: "text-purple-400 bg-purple-900/20 border-purple-500/20",
    green: "text-green-400 bg-green-900/20 border-green-500/20",
  };

  return (
    <div
      className={`p-8 rounded-2xl border ${
        colors[color].split(" ")[2]
      } bg-slate-900/30 hover:bg-slate-900/50 transition-colors`}
    >
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${
          colors[color].split(" ")[1]
        }`}
      >
        <Icon className={`w-6 h-6 ${colors[color].split(" ")[0]}`} />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400">{desc}</p>
    </div>
  );
}
