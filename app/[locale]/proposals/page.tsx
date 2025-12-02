"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization, canEditData, canDeleteData } from "@/contexts/OrganizationContext";
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
  const { currentOrg, userRole } = useOrganization();
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
    if (newStatus === 'completed' && currentOrg) {
        const companyName = proposal.customers?.company_name || "Müşteri";
        
        // Yerel Tarih
        const localDate = new Date();
        const formattedDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

        const { error: transError } = await supabase.from("transactions").insert([{
            organization_id: currentOrg.id,
            description: `${companyName} - Proje Geliri (Oto)`,
            amount: proposal.total_amount,
            type: "income",
            category: "project",
            date: formattedDate,
            proposal_id: proposal.id
        }]);

        if (!transError) toast.success("✅ Tutar Kasaya 'GELİR' olarak eklendi!");
    } else if (newStatus !== 'completed') {
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
      if (!currentActionProposal || !currentOrg) return;

      // 1. Durumu Güncelle
      await performStatusUpdate(currentActionProposal, 'accepted');

      // 2. Sözleşmeyi Oluştur
      const contractNo = `CNT-${currentActionProposal.proposal_no}`;
      const { error } = await supabase.from("contracts").insert([{
        organization_id: currentOrg.id,
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
      router.push(`/contracts/create?proposalId=${currentActionProposal.id}` as any);
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

  // Badge Rengi - Light tema uyumlu
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700 border border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">● Tamamlandı 💸</Badge>;
      case 'accepted': return <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30">◐ Onaylandı ⏳</Badge>;
      case 'sent': return <Badge className="bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">○ Gönderildi ✉️</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">✕ Reddedildi</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border border-border dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600">○ Taslak 📝</Badge>;
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
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-500" /> Teklif Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">
            Hazırladığın tüm tekliflerin durumunu buradan yönet.
          </p>
        </div>
        {canEditData(userRole) && (
          <Link href="/proposals/create">
            <Button className="bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/25 border-0 rounded-xl px-6 py-2 h-auto font-semibold">
              <Plus className="mr-2 h-4 w-4" /> Yeni Teklif Oluştur
            </Button>
          </Link>
        )}
      </div>

      {/* FİLTRE */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Teklif No veya Firma ara..." 
          className="pl-10 bg-muted/50 border-border text-foreground focus:border-primary h-10 rounded-xl" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* TABLO */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-slate-900/30">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Teklif No</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Müşteri</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Tutar</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Durum</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Tarih</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Yükleniyor...</TableCell></TableRow> :
             filteredProposals.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Kayıtlı teklif yok.</TableCell></TableRow> :
             filteredProposals.map((proposal) => (
                <TableRow key={proposal.id} className="border-border/50 hover:bg-muted/50 dark:hover:bg-slate-900/30 transition-colors">
                  <TableCell className="font-medium font-mono text-primary">
                    {proposal.proposal_no}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        {proposal.customers?.company_name}
                        {proposal.customers?.is_archived && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-mono">ARŞİVLİ</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{proposal.customers?.contact_person}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {Number(proposal.total_amount).toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(proposal.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    
                    {/* İŞLEM MENÜSÜ */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground w-56">
                        <DropdownMenuLabel>Aksiyonlar</DropdownMenuLabel>

                        <Link href={`/preview/proposal/${proposal.access_key}` as any} target="_blank">
                          <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                            <Eye className="mr-2 h-4 w-4 text-primary" /> PDF Önizle
                          </DropdownMenuItem>
                        </Link>

                        {/* Durum değiştirme - sadece edit yetkisi olanlar */}
                        {canEditData(userRole) && (
                          <>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Durum</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'sent')} className="hover:bg-accent focus:bg-accent">
                              <Send className="mr-2 h-4 w-4 text-blue-500" /> Gönderildi
                            </DropdownMenuItem>
                            
                            {/* ONYALANDI BUTONU - MODAL AÇAR */}
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'accepted')} className="hover:bg-accent focus:bg-accent">
                              <CheckCircle className="mr-2 h-4 w-4 text-indigo-500" /> Onaylandı (Başla)
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => updateStatus(proposal, 'completed')} className="hover:bg-accent focus:bg-accent">
                              <Briefcase className="mr-2 h-4 w-4 text-green-500" /> Tamamlandı (Kasa)
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
            }
          </TableBody>
        </Table>
      </div>

      {/* --- SÖZLEŞME OLUŞTURMA POPUP'I --- */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                    <FileSignature className="w-6 h-6 text-green-500"/> Hizmet Sözleşmesi
                </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-muted-foreground text-sm">
                Teklif onaylandı olarak işaretleniyor. Bu proje için <strong className="text-foreground">Otomatik Hizmet Sözleşmesi</strong> hazırlamak ister misiniz?
            </div>
            <div className="flex flex-col gap-3 py-4">
                <Button onClick={createAutoContract} className="bg-green-600 hover:bg-green-500 text-white justify-start h-auto py-3 px-4 rounded-xl border border-green-500/50">
                    <div className="text-left">
                        <div className="font-bold text-base">Evet, Otomatik Oluştur</div>
                        <div className="text-xs text-green-100 opacity-80">Varsayılan şablon kullanılarak anında oluşturulur.</div>
                    </div>
                </Button>

                <Button onClick={goToManualContract} variant="secondary" className="bg-muted hover:bg-muted/80 text-foreground justify-start h-auto py-3 px-4 rounded-xl border border-border">
                    <div className="text-left">
                        <div className="font-bold text-base">Manuel Düzenle</div>
                        <div className="text-xs text-muted-foreground">Editör açılarak maddeleri özelleştirmenizi sağlar.</div>
                    </div>
                </Button>
                
                <Button onClick={skipContract} variant="ghost" className="text-muted-foreground hover:text-foreground justify-center mt-2 hover:bg-muted">
                    Hayır, Sadece Durumu Güncelle
                </Button>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
