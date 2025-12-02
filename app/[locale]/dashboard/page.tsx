"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { useOrganization, canEditData, canDeleteData } from "@/contexts/OrganizationContext";
import { Link } from "@/navigation";
import { 
  TrendingUp, 
  Hourglass,
  Wallet,
  Users,
  FileText,
  ArrowUpRight,
  MoreHorizontal,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Briefcase,
  Archive,
  Trash2,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Stats {
  potential_revenue: number;
  pending_collection: number;
  net_income: number;
  active_customers: number;
  total_proposals: number;
}

interface Proposal {
  id: string;
  created_at: string;
  proposal_no: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'completed';
  total_amount: number;
  customer_id: string;
  access_key: string;
  customers: {
    company_name: string;
    contact_person: string;
    is_archived: boolean;
  };
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const supabase = createClient();
  const { currentOrg, userRole } = useOrganization();
  const [stats, setStats] = useState<Stats>({
    potential_revenue: 0,
    pending_collection: 0,
    net_income: 0,
    active_customers: 0,
    total_proposals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const fetchData = async () => {
    // Teklifler
    const { data: proposalsData } = await supabase
      .from("proposals")
      .select("*, customers(company_name, contact_person, is_archived)")
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
    // Potansiyel Ciro: Bekleyen işler (sent durumundaki teklifler)
    const potential = proposalsData?.reduce((sum, p) => {
      if (p.status === "sent") {
        return sum + Number(p.total_amount || 0);
      }
      return sum;
    }, 0) || 0;

    // Tahsilat Bekleyen: Onaylandı ama tamamlanmamış (accepted durumundaki teklifler)
    const pending = proposalsData?.reduce((sum, p) => {
      if (p.status === "accepted") {
        return sum + Number(p.total_amount || 0);
      }
      return sum;
    }, 0) || 0;

    // Net Kasa Girişi: Tamamlanan projelerden gelen gelir
    const netIncome = transactions
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

    setStats({
      potential_revenue: potential,
      pending_collection: pending,
      net_income: netIncome,
      active_customers: customers?.length || 0,
      total_proposals: proposalsData?.length || 0,
    });

    setProposals((proposalsData as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Durum güncelleme
  const updateStatus = async (proposal: Proposal, newStatus: string) => {
    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Durum güncellenemedi.");
      return;
    }

    if (newStatus === 'completed' && currentOrg) {
      const companyName = proposal.customers?.company_name || "Müşteri";
      const localDate = new Date();
      const formattedDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

      await supabase.from("transactions").insert([{
        organization_id: currentOrg.id,
        description: `${companyName} - Proje Geliri (Oto)`,
        amount: proposal.total_amount,
        type: "income",
        category: "project",
        date: formattedDate,
        proposal_id: proposal.id
      }]);
      toast.success("✅ Tutar Kasaya 'GELİR' olarak eklendi!");
    } else if (newStatus !== 'completed') {
      toast.success(`Durum güncellendi: ${newStatus.toUpperCase()}`);
    }

    // Listeyi ve statsları yeniden çek
    fetchData();
  };

  // Arşivle
  const handleArchive = async (id: string) => {
    if(!confirm("Bu teklifi arşivlemek istiyor musunuz?")) return;
    const { error } = await supabase.from("proposals").update({ is_archived: true }).eq("id", id);
    if (!error) {
      toast.success("Teklif arşivlendi.");
      fetchData();
    }
  };

  // Sil
  const handleDelete = async (id: string) => {
    if (!confirm("DİKKAT: Teklif ve finansal kayıtları KALICI olarak silinecek.")) return;
    await supabase.from("transactions").delete().eq("proposal_id", id);
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (error) toast.error("Silinemedi.");
    else {
      toast.success("Teklif silindi.");
      fetchData();
    }
  };

  // Badge Rengi
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700 border border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">● Tamamlandı</Badge>;
      case 'accepted': return <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30">◐ Onaylandı</Badge>;
      case 'sent': return <Badge className="bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">○ Gönderildi</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">✕ Reddedildi</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border border-border dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600">○ Taslak</Badge>;
    }
  };

  const statCards = [
    {
      label: "POTANSİYEL CİRO",
      value: stats.potential_revenue,
      subtitle: "Bekleyen İşler",
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      lightBg: "bg-orange-100",
      darkBg: "dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-500/30",
      iconBg: "bg-orange-50 dark:bg-slate-950/60",
      iconBorder: "border-orange-200 dark:border-slate-800",
      isCurrency: true,
    },
    {
      label: "TAHSİLAT BEKLEYEN",
      value: stats.pending_collection,
      subtitle: "Onaylandı, İşlemde",
      icon: Hourglass,
      color: "text-purple-600 dark:text-purple-400",
      lightBg: "bg-purple-100",
      darkBg: "dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-500/30",
      iconBg: "bg-purple-50 dark:bg-slate-950/60",
      iconBorder: "border-purple-200 dark:border-slate-800",
      isCurrency: true,
    },
    {
      label: "NET KASA GİRİŞİ",
      value: stats.net_income,
      subtitle: "Tamamlanan Projeler",
      icon: Wallet,
      color: "text-emerald-600 dark:text-emerald-400",
      lightBg: "bg-emerald-100",
      darkBg: "dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-500/30",
      iconBg: "bg-emerald-50 dark:bg-slate-950/60",
      iconBorder: "border-emerald-200 dark:border-slate-800",
      isCurrency: true,
    },
    {
      label: "MÜŞTERİ AĞI",
      value: stats.active_customers,
      subtitle: "Aktif Firma Kaydı",
      icon: Users,
      color: "text-pink-600 dark:text-pink-400",
      lightBg: "bg-pink-100",
      darkBg: "dark:bg-pink-900/20",
      borderColor: "border-pink-200 dark:border-pink-500/30",
      iconBg: "bg-pink-50 dark:bg-slate-950/60",
      iconBorder: "border-pink-200 dark:border-slate-800",
      isCurrency: false,
    },
    {
      label: "TEKLİF HACMİ",
      value: stats.total_proposals,
      subtitle: "Oluşturulan Belge",
      icon: FileText,
      color: "text-teal-600 dark:text-teal-400",
      lightBg: "bg-teal-100",
      darkBg: "dark:bg-teal-900/20",
      borderColor: "border-teal-200 dark:border-teal-500/30",
      iconBg: "bg-teal-50 dark:bg-slate-950/60",
      iconBorder: "border-teal-200 dark:border-slate-800",
      isCurrency: false,
    },
  ];

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold text-foreground">
            Hızlı Panel
          </h1>
          <p className="text-muted-foreground text-base">Hoş geldin Kaptan. Tüm sistemler aktif ve izleniyor.</p>
        </div>
        {canEditData(userRole) && (
          <Link href="/proposals/create">
            <Button className="bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/25 border-0 rounded-xl px-6 py-2 h-auto font-semibold">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Yeni Teklif Başlat
            </Button>
          </Link>
        )}
      </div>

      {/* VIEWER BİLGİ KARTI */}
      {userRole === 'viewer' && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                İzleyici Modu
                <Badge variant="outline" className="text-xs font-normal border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                  Sadece Görüntüleme
                </Badge>
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Bu organizasyonda <strong>İzleyici</strong> rolündesiniz. Verileri görüntüleyebilir ancak düzenleme, oluşturma veya silme işlemleri yapamazsınız.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`p-5 rounded-2xl relative overflow-hidden group border ${stat.borderColor} ${stat.lightBg} ${stat.darkBg} hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg bg-card/50 backdrop-blur-sm`}
          >
            {/* Arka plandaki dev ikon */}
            <div className={`absolute -right-6 -top-6 opacity-[0.08] dark:opacity-[0.07] group-hover:opacity-[0.15] dark:group-hover:opacity-[0.12] transition-all duration-500 ease-out group-hover:scale-110 ${stat.color}`}>
              <stat.icon className="w-28 h-28" strokeWidth={1.5} />
            </div>

            {/* Ön plan içeriği */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                {/* İkon Kutusu */}
                <div className={`p-3 rounded-xl ${stat.iconBg} border ${stat.iconBorder} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                
                {/* Küçük Tech Efekti (Barlar) */}
                <div className="flex gap-1 h-4 items-end opacity-40 dark:opacity-30">
                  <div className="w-1 h-2 bg-muted-foreground/40 rounded-full"></div>
                  <div className="w-1 h-3 bg-muted-foreground/40 rounded-full"></div>
                  <div className={`w-1 h-4 rounded-full bg-current ${stat.color} animate-pulse`}></div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.15em]">
                  {stat.label}
                </p>
                <p className="text-2xl font-black text-foreground tracking-tight flex items-baseline gap-1">
                  {stat.value.toLocaleString("tr-TR")}
                  {stat.isCurrency && (
                    <span className={`text-base font-medium opacity-70 ${stat.color}`}>₺</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SON OPERASYONLAR */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-md">
        <div className="flex justify-between items-center p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <h2 className="text-lg font-bold text-foreground">Son Operasyonlar</h2>
          </div>
          <Link href="/proposals">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-sm">
              Tümünü Gör
            </Button>
          </Link>
        </div>

        <Table>
          <TableHeader className="bg-muted/50 dark:bg-slate-900/30">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Teklif No</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Firma</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Durum</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-right">Tutar</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : proposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Henüz teklif yok.
                </TableCell>
              </TableRow>
            ) : (
              proposals.slice(0, 10).map((proposal) => (
                <TableRow key={proposal.id} className="border-border/50 hover:bg-muted/50 dark:hover:bg-slate-900/30 transition-colors">
                  <TableCell className="font-mono text-primary font-medium">
                    {proposal.proposal_no}
                  </TableCell>
                  <TableCell className="text-foreground/80">
                    {proposal.customers?.company_name || `Müşteri ID: ...${proposal.customer_id?.slice(-5)}`}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(proposal.status)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {Number(proposal.total_amount).toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground w-48">
                        <DropdownMenuLabel>Aksiyonlar</DropdownMenuLabel>

                        <a href={`/preview/proposal/${proposal.access_key}`} target="_blank" rel="noopener noreferrer">
                          <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                            <Eye className="mr-2 h-4 w-4 text-primary" /> Önizle
                          </DropdownMenuItem>
                        </a>

                        {/* Durum değiştirme - sadece edit yetkisi olanlar */}
                        {canEditData(userRole) && (
                          <>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Durum</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'sent')} className="hover:bg-accent focus:bg-accent">
                              <Send className="mr-2 h-4 w-4 text-blue-500" /> Gönderildi
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'accepted')} className="hover:bg-accent focus:bg-accent">
                              <CheckCircle className="mr-2 h-4 w-4 text-indigo-500" /> Onaylandı
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'completed')} className="hover:bg-accent focus:bg-accent">
                              <Briefcase className="mr-2 h-4 w-4 text-green-500" /> Tamamlandı
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'rejected')} className="hover:bg-accent focus:bg-accent">
                              <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reddedildi
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Arşiv ve Silme - sadece admin/owner */}
                        {canDeleteData(userRole) && (
                          <>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem onClick={() => handleArchive(proposal.id)} className="text-orange-600 dark:text-orange-400 hover:bg-accent focus:bg-accent cursor-pointer">
                              <Archive className="mr-2 h-4 w-4" /> Arşivle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(proposal.id)} className="text-red-600 dark:text-red-500 hover:bg-accent focus:bg-accent cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Sil
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
