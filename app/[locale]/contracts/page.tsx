"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Search,
  FileSignature,
  MoreHorizontal,
  CheckCircle,
  Trash2,
  Info,
  Calendar,
  User,
  FileText,
  ShieldCheck,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/navigation";

// Veri Tipleri
interface ContractClause {
  title: string;
  content: string;
}

interface Contract {
  id: string;
  created_at: string;
  contract_no: string;
  status: "draft" | "signed" | "terminated";
  content: { clauses: ContractClause[] }; // JSON içeriği
  customer_id: string;
  customers: {
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
  };
}

export default function ContractsPage() {
  const supabase = createClient();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- STATE'LER ---
  const [activeTab, setActiveTab] = useState("all"); // Tab Filtresi
  const [isViewOpen, setIsViewOpen] = useState(false); // Modal Açık mı?
  const [viewContract, setViewContract] = useState<Contract | null>(null); // Seçilen Sözleşme

  // Verileri Çek
  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select(`*, customers (company_name, contact_person, email, phone)`)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Sözleşmeler yüklenemedi.");
    } else {
      setContracts((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // Silme İşlemi
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Satır tıklamasını engelle
    if (!confirm("Bu sözleşmeyi silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) toast.error("Silinemedi.");
    else {
      toast.success("Sözleşme silindi.");
      setContracts(contracts.filter((c) => c.id !== id));
    }
  };

  // Durum Güncelleme
  const handleSign = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Satır tıklamasını engelle
    const { error } = await supabase
      .from("contracts")
      .update({ status: "signed" })
      .eq("id", id);
    if (!error) {
      toast.success("Sözleşme imzalandı olarak işaretlendi! ✍️");
      // Listeyi yerel güncelle
      setContracts(
        contracts.map((c) => (c.id === id ? { ...c, status: "signed" } : c))
      );
    }
  };

  // Satıra Tıklama (Detay Aç)
  const handleRowClick = (contract: Contract) => {
    setViewContract(contract);
    setIsViewOpen(true);
  };

  // Filtreleme Mantığı (Arama + Tab)
  const filteredContracts = contracts.filter((c) => {
    // 1. Arama Filtresi
    const searchMatch =
      c.contract_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customers?.company_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    // 2. Tab Filtresi
    let tabMatch = true;
    if (activeTab === "signed") tabMatch = c.status === "signed";
    if (activeTab === "draft") tabMatch = c.status === "draft"; // İmza Bekleyen

    return searchMatch && tabMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed":
        return (
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/20">
            İmzalandı
          </Badge>
        );
      case "terminated":
        return <Badge variant="destructive">Feshedildi</Badge>;
      default:
        return (
          <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/20 animate-pulse">
            İmza Bekliyor
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white glow-text flex items-center gap-3">
            <FileSignature className="h-8 w-8 text-indigo-500" /> Sözleşme
            Yönetimi
          </h1>
          <p className="text-slate-400 mt-1">
            Resmi hizmet sözleşmeleri ve hukuksal süreçler.
          </p>
        </div>
      </div>

      {/* TABS (FİLTRELEME) */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-6 rounded-lg"
            >
              Tümü
            </TabsTrigger>
            <TabsTrigger
              value="signed"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white px-6 rounded-lg"
            >
              İmzalananlar
            </TabsTrigger>
            <TabsTrigger
              value="draft"
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white px-6 rounded-lg"
            >
              İmza Bekleyen
            </TabsTrigger>
          </TabsList>

          {/* ARAMA ÇUBUĞU */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Sözleşme No veya Firma ara..."
              className="pl-10 bg-slate-900/30 border-slate-700 text-white focus:border-blue-500 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABLO */}
        <TabsContent value={activeTab} className="mt-6">
          <div className="glass-panel rounded-2xl overflow-hidden neon-border">
            <Table>
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Sözleşme No</TableHead>
                  <TableHead className="text-slate-400">Müşteri</TableHead>
                  <TableHead className="text-slate-400">Durum</TableHead>
                  <TableHead className="text-slate-400">Oluşturulma</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    İşlemler
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center h-24 text-slate-500"
                    >
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center h-24 text-slate-500"
                    >
                      Kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((contract) => (
                    <TableRow
                      key={contract.id}
                      className="border-slate-800 hover:bg-blue-900/10 transition-colors cursor-pointer group"
                      onClick={() => handleRowClick(contract)} // --- ROW CLICK ---
                    >
                      <TableCell className="font-mono text-indigo-400 font-medium group-hover:text-indigo-300">
                        {contract.contract_no || "TASLAK"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">
                            {contract.customers?.company_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {contract.customers?.contact_person}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(contract.created_at).toLocaleDateString(
                          "tr-TR"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div onClick={(e) => e.stopPropagation()}>
                          {" "}
                          {/* BUTONLARI İZOLE ET */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-slate-900 border-slate-700 text-slate-200 w-48"
                            >
                              <DropdownMenuLabel>Aksiyonlar</DropdownMenuLabel>

                              <Link
                                href={`/preview/contract/${contract.id}`}
                                target="_blank"
                              >
                                <DropdownMenuItem className="cursor-pointer hover:bg-slate-800">
                                  <Eye className="mr-2 h-4 w-4 text-blue-400" />{" "}
                                  PDF / İncele
                                </DropdownMenuItem>
                              </Link>

                              <DropdownMenuItem
                                onClick={(e) => handleSign(e, contract.id)}
                                className="hover:bg-slate-800 cursor-pointer"
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />{" "}
                                İmzalandı İşaretle
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-slate-700" />

                              <DropdownMenuItem
                                onClick={(e) => handleDelete(e, contract.id)}
                                className="text-red-500 hover:bg-slate-800 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- SÖZLEŞME İNCELEME MODALI (YENİ) --- */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] glass-panel border-slate-700 text-white flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-indigo-500" /> Sözleşme
              Detayı
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {viewContract?.contract_no} -{" "}
              {viewContract?.customers?.company_name}
            </DialogDescription>
          </DialogHeader>

          {viewContract && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 custom-scrollbar">
              {/* Müşteri Özeti Kartı */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <div className="text-slate-500 text-xs uppercase font-semibold tracking-wider mb-1">
                    Müşteri
                  </div>
                  <div className="font-bold text-white text-base">
                    {viewContract.customers.company_name}
                  </div>
                  <div className="text-slate-400">
                    {viewContract.customers.contact_person}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase font-semibold tracking-wider mb-1">
                    Tarih & Durum
                  </div>
                  <div className="font-bold text-white text-base">
                    {new Date(viewContract.created_at).toLocaleDateString(
                      "tr-TR"
                    )}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(viewContract.status)}
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-800 mb-6" />

              {/* Sözleşme Metni (ScrollArea yerine düz div kullandık) */}
              <div className="rounded-md border border-slate-800 bg-slate-950 p-6 space-y-8">
                {viewContract.content?.clauses?.map((clause, i) => (
                  <div key={i}>
                    <h4 className="text-indigo-400 font-bold mb-3 text-sm uppercase tracking-wide border-b border-indigo-900/30 pb-2">
                      {clause.title}
                    </h4>
                    {/* HTML İçeriği */}
                    <div
                      className="text-slate-300 text-sm leading-relaxed space-y-2 text-justify"
                      dangerouslySetInnerHTML={{ __html: clause.content }}
                    />
                  </div>
                ))}
              </div>

              {/* Kapat Butonu */}
              {/* <div className="pt-6 flex justify-end sticky bottom-0">
                <Button
                  onClick={() => setIsViewOpen(false)}
                  variant="secondary"
                  className="bg-slate-800 hover:bg-slate-700 text-white"
                >
                  Kapat
                </Button>
              </div> */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
