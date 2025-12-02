"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Users, 
  Wallet,
  Rocket
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DashboardActions } from "@/components/dashboard/DashboardActions";

interface Stats {
  potential_revenue: number;
  collected_revenue: number;
  total_proposals: number;
  active_customers: number;
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    potential_revenue: 0,
    collected_revenue: 0,
    total_proposals: 0,
    active_customers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [latestProposal, setLatestProposal] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Teklifler
      const { data: proposals } = await supabase
        .from("proposals")
        .select("*, customers(company_name)")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      // Müşteriler
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("is_archived", false);

      // Finansal işlemler
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type");

      // Hesaplamalar
      const potential = proposals?.reduce((sum, p) => {
        if (p.status === "sent" || p.status === "accepted") {
          return sum + Number(p.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      const collected = transactions
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

      setStats({
        potential_revenue: potential,
        collected_revenue: collected,
        total_proposals: proposals?.length || 0,
        active_customers: customers?.length || 0,
      });

      setLatestProposal(proposals?.[0] || null);
      setLoading(false);
    };

    fetchData();
  }, []);

  const statCards = [
    {
      label: t("potential_revenue"),
      value: stats.potential_revenue,
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      borderColor: "border-blue-500/20",
    },
    {
      label: t("collected_revenue"),
      value: stats.collected_revenue,
      icon: TrendingDown,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      borderColor: "border-green-500/20",
    },
    {
      label: t("total_proposals"),
      value: stats.total_proposals,
      icon: FileText,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      borderColor: "border-purple-500/20",
    },
    {
      label: t("active_customers"),
      value: stats.active_customers,
      icon: Users,
      color: "text-orange-400",
      bgColor: "bg-orange-900/20",
      borderColor: "border-orange-500/20",
    },
  ];

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-white glow-text flex items-center gap-3">
          <Rocket className="h-10 w-10 text-blue-500" />
          {t("title")}
        </h1>
        <p className="text-slate-400 text-lg">{t("subtitle")}</p>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className={`glass-panel p-6 rounded-2xl border ${stat.borderColor} ${stat.bgColor} hover:scale-105 transition-transform`}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div className={`w-3 h-3 rounded-full ${stat.color.replace("text-", "bg-")} opacity-50 animate-pulse`} />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value.toLocaleString("tr-TR")} {stat.label.includes("Ciro") || stat.label.includes("Revenue") ? "₺" : ""}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* SON TEKLİF AKSİYONLARI */}
      {latestProposal && (
        <Card className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-400" />
            Son Teklif - Hızlı Aksiyonlar
          </h2>
          <DashboardActions proposal={latestProposal} />
        </Card>
      )}

      {/* BOŞ DURUM */}
      {!loading && stats.total_proposals === 0 && (
        <Card className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <Rocket className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Henüz Teklif Yok</h3>
          <p className="text-slate-400 mb-6">
            İlk teklifinizi oluşturarak başlayın.
          </p>
        </Card>
      )}
    </div>
  );
}

