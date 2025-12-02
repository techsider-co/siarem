"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOrganization, canEditData, canDeleteData } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Calendar,
  Zap,
  Activity,
  Printer,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// --- VERİ TİPLERİ ---
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // YYYY-MM-DD string gelir
  proposal_id?: string;
}

interface Proposal {
  id: string;
  proposal_no: string;
  total_amount: number;
  customers: { company_name: string };
}

// --- SABİT VERİLER ---
const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
const YEARS = [2024, 2025, 2026, 2027];

export default function FinancePage() {
  const supabase = createClient();
  const { currentOrg, userRole } = useOrganization();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filtre State'leri (Bugünün ayı ve yılı varsayılan)
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    today.getMonth().toString()
  ); // 0-11
  const [selectedYear, setSelectedYear] = useState<string>(
    today.getFullYear().toString()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Form State
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "expense",
    category: "software",
    date: new Date().toISOString().split("T")[0],
    proposal_id: "none",
  });

  // --- VERİ ÇEKME ---
  const fetchData = async () => {
    setLoading(true);

    // Transactions
    const { data: transData, error: transError } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false }); // En yeniden eskiye

    if (transError) {
      console.error("Transaction Fetch Error:", transError);
      toast.error("Veriler çekilemedi.");
    } else {
      setAllTransactions(transData || []);
    }

    // Proposals (Onaylılar dropdown için)
    const { data: propData } = await supabase
      .from("proposals")
      .select("id, proposal_no, total_amount, customers(company_name)")
      .in("status", ["accepted", "completed"])
      .order("created_at", { ascending: false });

    if (propData) setProposals(propData as any);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- SAĞLAM FİLTRELEME MANTIĞI (STRING PARSING) ---
  // Date objesi kullanmıyoruz, string parçalıyoruz (Timezone hatasını önler)

  const filterLogic = (t: Transaction) => {
    if (!t.date) return false;

    // t.date formatı: "2025-12-01"
    const [tYear, tMonth, tDay] = t.date.split("-");

    // Ay kontrolü (Veritabanında '01'...'12', Bizim state '0'...'11')
    // parseInt("01") -> 1. State 0 ise (Ocak), db 1 olmalı.
    // Yani: State(0) + 1 == DB(1)

    const dbMonthIndex = parseInt(tMonth) - 1; // 0-11 arasına çekiyoruz

    const isMonthMatch =
      selectedMonth === "all" || dbMonthIndex === Number(selectedMonth);
    const isYearMatch = selectedYear === "all" || tYear === selectedYear;

    return isMonthMatch && isYearMatch;
  };

  // 1. Dönem Filtresi
  const periodTransactions = allTransactions.filter(filterLogic);

  // 2. Tablo Filtresi (Dönem + Kategori)
  const tableTransactions = periodTransactions.filter((t) => {
    return selectedCategory === "all" || t.category === selectedCategory;
  });

  // --- HESAPLAMALAR ---
  const periodIncome = periodTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const periodExpense = periodTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const periodBalance = periodIncome - periodExpense;
  const totalTurnover = periodIncome;

  // Tablo Toplamları
  const tableNet =
    tableTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) -
    tableTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

  // --- HANDLERS ---
  const handleProposalChange = (pid: string) => {
    if (pid === "none") {
      setFormData({
        ...formData,
        proposal_id: "none",
        description: "",
        amount: "",
      });
      return;
    }
    const p = proposals.find((x) => x.id === pid);
    if (p)
      setFormData({
        ...formData,
        proposal_id: pid,
        description: `${p.customers.company_name} - Proje Ödemesi`,
        amount: p.total_amount.toString(),
        type: "income",
        category: "project",
      });
  };

  const applyRuulCommission = () => {
    const p = proposals.find((x) => x.id === formData.proposal_id);
    if (!p) {
      toast.warning("Teklif seçin.");
      return;
    }
    setFormData({
      ...formData,
      amount: (p.total_amount * 0.05).toString(),
      description: `Ruul Komisyonu (%5) - ${p.customers.company_name}`,
      type: "expense",
      category: "commission",
    });
    toast.info("Hesaplandı.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.warning("Doldurun.");
      return;
    }
    if (!currentOrg) {
      toast.error("Organizasyon bulunamadı.");
      return;
    }

    const payload: any = {
      organization_id: currentOrg.id,
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type,
      category: formData.category,
      date: formData.date,
    };
    if (formData.proposal_id !== "none")
      payload.proposal_id = formData.proposal_id;

    const { error } = await supabase.from("transactions").insert([payload]);

    if (error) {
      toast.error("Hata: " + error.message);
    } else {
      toast.success("İşlem kaydedildi! 💸");
      setIsDialogOpen(false);

      // Formu sıfırla
      setFormData({
        description: "",
        amount: "",
        type: "expense",
        category: "software",
        date: new Date().toISOString().split("T")[0],
        proposal_id: "none",
      });

      // Listeyi yenile
      fetchData();

      // EKLENEN VERİ GÖRÜNSÜN DİYE FİLTREYİ AYARLA
      // Eklenen tarihin ayını ve yılını seçili filtre yapalım ki kullanıcı "Nereye gitti bu?" demesin.
      const [y, m, d] = payload.date.split("-");
      setSelectedYear(y);
      setSelectedMonth((parseInt(m) - 1).toString());
      setSelectedCategory("all");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Silinsin mi?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) {
      toast.success("Silindi.");
      // Local state'den çıkar (Hızlı UI güncellemesi)
      setAllTransactions(allTransactions.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-8 p-8 print:space-y-4">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          aside,
          button,
          .no-print {
            display: none !important;
          }
          .glass-panel {
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            color: black !important;
          }
          .text-slate-400,
          .text-white,
          .text-foreground,
          .text-muted-foreground {
            color: black !important;
          }
          .glow-text {
            text-shadow: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th,
          td {
            border-bottom: 1px solid #ddd !important;
            padding: 8px !important;
            color: black !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="h-8 w-8 text-green-500" /> Finansal Raporlama
          </h1>
          <p className="text-muted-foreground mt-1">
            Dönem:{" "}
            {selectedMonth !== "all"
              ? MONTHS[Number(selectedMonth)]
              : "Tüm Aylar"}{" "}
            {selectedYear}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Printer className="mr-2 h-4 w-4" /> Raporu Yazdır
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {canEditData(userRole) && (
              <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-green-600/25">
                  <Plus className="mr-2 h-4 w-4" /> Yeni İşlem
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="text-foreground">Yeni Finansal Hareket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="grid gap-4 py-4">
                <div className="bg-blue-50 dark:bg-slate-900/50 p-4 rounded-lg border border-blue-200 dark:border-slate-700 space-y-3">
                  <Label className="text-primary text-xs font-bold uppercase">
                    Otomatik Doldur
                  </Label>
                  <Select
                    onValueChange={handleProposalChange}
                    value={formData.proposal_id}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-border text-foreground">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="none">-- Manuel --</SelectItem>
                      {proposals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.proposal_no} - {p.customers.company_name} (
                          {Number(p.total_amount).toLocaleString()} ₺)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.proposal_id !== "none" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyRuulCommission}
                      className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Zap className="mr-2 h-3 w-3 text-yellow-500" /> Ruul %5
                      Ekle
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Tipi</Label>
                    <Select
                      onValueChange={(val) =>
                        setFormData({ ...formData, type: val as any })
                      }
                      value={formData.type}
                    >
                      <SelectTrigger className="bg-muted/50 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="income">Gelir (+)</SelectItem>
                        <SelectItem value="expense">Gider (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Tutar (₺)</Label>
                    <Input
                      type="number"
                      className="bg-muted/50 border-border text-foreground"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Açıklama</Label>
                  <Input
                    className="bg-muted/50 border-border text-foreground"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Kategori</Label>
                    <Select
                      onValueChange={(val) =>
                        setFormData({ ...formData, category: val })
                      }
                      value={formData.category}
                    >
                      <SelectTrigger className="bg-muted/50 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="project">Proje</SelectItem>
                        <SelectItem value="commission">Komisyon</SelectItem>
                        <SelectItem value="software">Yazılım</SelectItem>
                        <SelectItem value="hosting">Domain/Host</SelectItem>
                        <SelectItem value="tax">Vergi</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Tarih</Label>
                    <Input
                      type="date"
                      className="bg-muted/50 border-border text-foreground"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="mt-4 bg-linear-to-r from-primary to-secondary text-primary-foreground border-0 shadow-lg shadow-primary/25"
                >
                  Kaydet
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* FİLTRE BAR */}
      <div className="bg-card/50 backdrop-blur-sm border border-border p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-sm no-print">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold uppercase tracking-wider mr-2">
          <Filter className="w-4 h-4" /> Filtrele:
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px] bg-muted/50 border-border text-foreground">
            <SelectValue placeholder="Yıl" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="all">Tümü</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[130px] bg-muted/50 border-border text-foreground">
            <SelectValue placeholder="Ay" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="all">Tümü</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={i.toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] bg-muted/50 border-border text-foreground">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            <SelectItem value="project">Proje Gelirleri</SelectItem>
            <SelectItem value="commission">Komisyon Giderleri</SelectItem>
            <SelectItem value="software">Yazılım/Lisans</SelectItem>
            <SelectItem value="hosting">Domain/Hosting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* BASKI BAŞLIĞI */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-black border-b pb-2">
          Finansal Rapor:{" "}
          {selectedMonth !== "all" ? MONTHS[Number(selectedMonth)] : ""}{" "}
          {selectedYear !== "all" ? selectedYear : ""}
        </h1>
        {selectedCategory !== "all" && (
          <p className="text-sm font-bold mt-1">
            Kategori: {selectedCategory.toUpperCase()}
          </p>
        )}
      </div>

      {/* ÖZET KARTLARI */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Toplam Ciro */}
        <div className="bg-purple-50 dark:bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-200 dark:border-border border-l-4 border-l-purple-500 shadow-sm">
          <div className="text-purple-600 dark:text-muted-foreground text-sm font-medium uppercase tracking-widest mb-2">
            Toplam Ciro
          </div>
          <div className="text-3xl font-bold text-foreground flex items-center gap-3">
            {totalTurnover.toLocaleString("tr-TR")} ₺{" "}
            <Activity className="h-6 w-6 text-purple-500" />
          </div>
        </div>
        
        {/* Toplam Gelir */}
        <div className="bg-green-50 dark:bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-green-200 dark:border-border border-l-4 border-l-green-500 shadow-sm">
          <div className="text-green-600 dark:text-muted-foreground text-sm font-medium uppercase tracking-widest mb-2">
            Toplam Gelir
          </div>
          <div className="text-3xl font-bold text-foreground flex items-center gap-3">
            {periodIncome.toLocaleString("tr-TR")} ₺{" "}
            <ArrowUpRight className="h-6 w-6 text-green-500" />
          </div>
        </div>
        
        {/* Toplam Gider */}
        <div className="bg-red-50 dark:bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-red-200 dark:border-border border-l-4 border-l-red-500 shadow-sm">
          <div className="text-red-600 dark:text-muted-foreground text-sm font-medium uppercase tracking-widest mb-2">
            Toplam Gider
          </div>
          <div className="text-3xl font-bold text-foreground flex items-center gap-3">
            {periodExpense.toLocaleString("tr-TR")} ₺{" "}
            <ArrowDownLeft className="h-6 w-6 text-red-500" />
          </div>
        </div>
        
        {/* Net Kasa */}
        <div className="bg-blue-50 dark:bg-blue-900/20 backdrop-blur-sm p-6 rounded-2xl border border-blue-200 dark:border-blue-500/30 border-l-4 border-l-blue-500 shadow-sm">
          <div className="text-blue-600 dark:text-blue-200 text-sm font-medium uppercase tracking-widest mb-2">
            Net Kasa
          </div>
          <div className="text-3xl font-bold text-foreground flex items-center gap-3">
            {periodBalance.toLocaleString("tr-TR")} ₺{" "}
            <Wallet className="h-6 w-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* TABLO */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-slate-900/30">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Açıklama</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Kategori</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Tarih</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-right">Tutar</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-right no-print">
                İşlem
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : tableTransactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  Seçilen dönemde kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              tableTransactions.map((t) => (
                <TableRow
                  key={t.id}
                  className="border-border/50 hover:bg-muted/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <TableCell className="font-medium text-foreground">
                    {t.description}
                    {t.proposal_id && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] h-5 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 no-print"
                      >
                        Teklif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground border border-border capitalize print:border-none print:pl-0">
                      {t.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3 no-print" />{" "}
                    {new Date(t.date).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}{" "}
                    {Number(t.amount).toLocaleString("tr-TR")} ₺
                  </TableCell>
                  <TableCell className="text-right no-print">
                    {canDeleteData(userRole) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id)}
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            {/* FİLTRELENMİŞ TOPLAM */}
            {tableTransactions.length > 0 && (
              <TableRow className="bg-muted/80 dark:bg-slate-900/80 font-bold border-t-2 border-border print:bg-gray-100 print:text-black">
                <TableCell
                  colSpan={3}
                  className="text-right text-muted-foreground print:text-black"
                >
                  LİSTE TOPLAMI:
                </TableCell>
                <TableCell
                  className={`text-right ${
                    tableNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  } print:text-black`}
                >
                  {tableNet.toLocaleString("tr-TR")} ₺
                </TableCell>
                <TableCell className="no-print"></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
