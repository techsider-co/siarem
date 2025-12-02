"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { DEFAULT_CONTRACT_CLAUSES } from "@/lib/constants";
import {
  Plus, Search, MoreHorizontal, CheckCircle, XCircle, Send, FileEdit, Trash2, Eye, FileSignature, Briefcase, Archive,
  FileText
} from "lucide-react";

// UI Bileşenleri
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

// Veri Tipi
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

export default function ProposalsListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- SÖZLEŞME STATE'LERİ ---
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [currentActionProposal, setCurrentActionProposal] = useState<Proposal | null>(null);

  // Verileri Çek
  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        *,
        customers (company_name, contact_person, is_archived)
      `)
      .eq('is_archived', false) // Sadece Aktifler
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Teklifler yüklenemedi.");
    } else {
      setProposals((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // --- ANA DURUM GÜNCELLEME YÖNETİCİSİ ---
  const updateStatus = async (proposal: Proposal, newStatus: string) => {
    // Eğer "Onaylandı" seçildiyse, önce Sözleşme Modalı aç, işlemi durdur.
    if (newStatus === 'accepted') {
        setCurrentActionProposal(proposal); // Hangi teklif olduğunu kaydet
        setShowContractDialog(true); // Modalı aç
        return;
    }
    
    // Diğer durumlar için direkt işlem yap
    await performStatusUpdate(proposal, newStatus);
  };

  // --- VERİTABANI GÜNCELLEME İŞLEMİ ---
  const performStatusUpdate = async (proposal: Proposal, newStatus: string) => {
    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Durum güncellenemedi.");
      return;
    }

    // OTOMATİK FİNANS KAYDI (Tamamlandıysa)
    if (newStatus === 'completed') {
        const companyName = proposal.customers?.company_name || "Müşteri";
        
        // Yerel Tarih
        const localDate = new Date();
        const formattedDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

        const { error: transError } = await supabase.from("transactions").insert([{
            description: `${companyName} - Proje Geliri (Oto)`,
            amount: proposal.total_amount,
            type: "income",
            category: "project",
            date: formattedDate,
            proposal_id: proposal.id
        }]);

        if (!transError) toast.success("✅ Tutar Kasaya 'GELİR' olarak eklendi!");
    } else {
        toast.success(`Durum güncellendi: ${newStatus.toUpperCase()}`);
    }

    // Listeyi yerel olarak güncelle (Hız için)
    setProposals(
      proposals.map((p) =>
        p.id === proposal.id ? { ...p, status: newStatus as any } : p
      )
    );
  };

  // --- SÖZLEŞME OLUŞTURUCU (AUTO) ---
  const createAutoContract = async () => {
      if (!currentActionProposal) return;

      // 1. Durumu Güncelle
      await performStatusUpdate(currentActionProposal, 'accepted');

      // 2. Sözleşmeyi Oluştur
      const contractNo = `CNT-${currentActionProposal.proposal_no}`;
      const { error } = await supabase.from("contracts").insert([{
        proposal_id: currentActionProposal.id,
        customer_id: currentActionProposal.customer_id,
        contract_no: contractNo,
        content: { clauses: DEFAULT_CONTRACT_CLAUSES },
        status: "draft"
      }]);

      if (!error) toast.success("Hizmet Sözleşmesi oluşturuldu! 📜");
      else toast.error("Sözleşme hatası: " + error.message);

      setShowContractDialog(false);
      setCurrentActionProposal(null);
  };

  // --- SÖZLEŞME OLUŞTURUCU (MANUAL) ---
  const goToManualContract = async () => {
      if (!currentActionProposal) return;
      // Önce durumu güncelle
      await performStatusUpdate(currentActionProposal, 'accepted');
      // Sonra editöre git
      router.push(`/contracts/create?proposalId=${currentActionProposal.id}`);
  };

  // --- SADECE DURUM GÜNCELLE (Sözleşmesiz) ---
  const skipContract = async () => {
      if (!currentActionProposal) return;
      await performStatusUpdate(currentActionProposal, 'accepted');
      setShowContractDialog(false);
      setCurrentActionProposal(null);
  };

  // --- ARŞİVLEME ---
  const handleArchive = async (id: string) => {
    if(!confirm("Bu teklifi arşivlemek istiyor musunuz?")) return;
    const { error } = await supabase.from("proposals").update({ is_archived: true }).eq("id", id);
    if (!error) {
        toast.success("Teklif arşivlendi.");
        setProposals(proposals.filter(p => p.id !== id)); // Listeden düşür
    }
  };

  // --- SİLME ---
  const handleDelete = async (id: string) => {
    if (!confirm("DİKKAT: Teklif ve finansal kayıtları KALICI olarak silinecek.")) return;
    
    // 1. Finans Kayıtlarını Sil
    await supabase.from("transactions").delete().eq("proposal_id", id);
    
    // 2. Teklifi Sil
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    
    if (error) toast.error("Silinemedi.");
    else {
      toast.success("Teklif silindi.");
      setProposals(proposals.filter((p) => p.id !== id));
    }
  };

  // Badge Rengi
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-400 border border-green-500/20 hover:bg-green-500/30">● Tamamlandı 💸</Badge>;
      case 'accepted': return <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/30">◐ Onaylandı ⏳</Badge>;
      case 'sent': return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30">○ Gönderildi ✉️</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">Reddedildi</Badge>;
      default: return <Badge className="bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700">Taslak 📝</Badge>;
    }
  };

  // Filtreleme
  const filteredProposals = proposals.filter(
    (p) =>
      p.proposal_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customers?.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white glow-text flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-500" /> Teklif Yönetimi
          </h1>
          <p className="text-slate-400 mt-1">
            Hazırladığın tüm tekliflerin durumunu buradan yönet.
          </p>
        </div>
        <Link href="/proposals/create">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border-0">
            <Plus className="mr-2 h-4 w-4" /> Yeni Teklif Oluştur
          </Button>
        </Link>
      </div>

      {/* FİLTRE */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <Input type="search" placeholder="Teklif No veya Firma ara..." className="pl-10 bg-slate-900/30 border-slate-700 text-white focus:border-blue-500 h-10 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* TABLO */}
      <div className="glass-panel rounded-2xl overflow-hidden neon-border">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Teklif No</TableHead>
              <TableHead className="text-slate-400">Müşteri</TableHead>
              <TableHead className="text-slate-400">Tutar</TableHead>
              <TableHead className="text-slate-400">Durum</TableHead>
              <TableHead className="text-slate-400">Tarih</TableHead>
              <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">Yükleniyor...</TableCell></TableRow> :
             filteredProposals.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-slate-500">Kayıtlı teklif yok.</TableCell></TableRow> :
             filteredProposals.map((proposal) => (
                <TableRow key={proposal.id} className="border-slate-800 hover:bg-blue-900/10 transition-colors">
                  <TableCell className="font-medium font-mono text-blue-400">
                    {proposal.proposal_no}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200 flex items-center gap-2">
                        {proposal.customers?.company_name}
                        {proposal.customers?.is_archived && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-900/30 text-orange-400 border border-orange-800 font-mono">ARŞİVLİ</span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">{proposal.customers?.contact_person}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-200">
                    {Number(proposal.total_amount).toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(proposal.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    
                    {/* İŞLEM MENÜSÜ */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700 text-slate-200 w-56">
                        <DropdownMenuLabel>Aksiyonlar</DropdownMenuLabel>

                        <Link href={`/preview/proposal/${proposal.access_key}`} target="_blank">
                          <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800">
                            <Eye className="mr-2 h-4 w-4 text-blue-400" /> PDF Önizle
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator className="bg-slate-700" />

                        <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">Durum</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => updateStatus(proposal, 'sent')} className="hover:bg-slate-800 focus:bg-slate-800">
                          <Send className="mr-2 h-4 w-4 text-blue-500" /> Gönderildi
                        </DropdownMenuItem>
                        
                        {/* ONYALANDI BUTONU - MODAL AÇAR */}
                        <DropdownMenuItem onClick={() => updateStatus(proposal, 'accepted')} className="hover:bg-slate-800 focus:bg-slate-800">
                          <CheckCircle className="mr-2 h-4 w-4 text-indigo-500" /> Onaylandı (Başla)
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => updateStatus(proposal, 'completed')} className="hover:bg-slate-800 focus:bg-slate-800">
                          <Briefcase className="mr-2 h-4 w-4 text-green-500" /> Tamamlandı (Kasa)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(proposal, 'rejected')} className="hover:bg-slate-800 focus:bg-slate-800">
                          <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reddedildi
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-slate-700" />

                        {/* SİLME VE ARŞİV */}
                        <DropdownMenuItem onClick={() => handleArchive(proposal.id)} className="text-orange-400 hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                            <Archive className="mr-2 h-4 w-4" /> Arşivle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(proposal.id)} className="text-red-600 hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>

      {/* --- SÖZLEŞME OLUŞTURMA POPUP'I --- */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <FileSignature className="w-6 h-6 text-green-500"/> Hizmet Sözleşmesi
                </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-slate-300 text-sm">
                Teklif onaylandı olarak işaretleniyor. Bu proje için <strong>Otomatik Hizmet Sözleşmesi</strong> hazırlamak ister misiniz?
            </div>
            <div className="flex flex-col gap-3 py-4">
                <Button onClick={createAutoContract} className="bg-green-600 hover:bg-green-500 text-white justify-start h-auto py-3 px-4 rounded-xl border border-green-500/50">
                    <div className="text-left">
                        <div className="font-bold text-base">Evet, Otomatik Oluştur</div>
                        <div className="text-xs text-green-100 opacity-80">Varsayılan şablon kullanılarak anında oluşturulur.</div>
                    </div>
                </Button>

                <Button onClick={goToManualContract} variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-white justify-start h-auto py-3 px-4 rounded-xl border border-slate-700">
                    <div className="text-left">
                        <div className="font-bold text-base">Manuel Düzenle</div>
                        <div className="text-xs text-slate-400">Editör açılarak maddeleri özelleştirmenizi sağlar.</div>
                    </div>
                </Button>
                
                <Button onClick={skipContract} variant="ghost" className="text-slate-500 hover:text-white justify-center mt-2 hover:bg-slate-800">
                    Hayır, Sadece Durumu Güncelle
                </Button>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}