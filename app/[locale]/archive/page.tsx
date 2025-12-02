"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Archive, RefreshCcw, Trash2, FileText, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ArchivePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [archivedProposals, setArchivedProposals] = useState<any[]>([]);
  const [archivedCustomers, setArchivedCustomers] = useState<any[]>([]);

  // Verileri Çek
  const fetchData = async () => {
    setLoading(true);
    
    const { data: propData } = await supabase
      .from("proposals")
      .select("*, customers(company_name)")
      .eq("is_archived", true) // Sadece Arşivliler
      .order("created_at", { ascending: false });
      
    const { data: custData } = await supabase
      .from("customers")
      .select("*")
      .eq("is_archived", true) // Sadece Arşivliler
      .order("created_at", { ascending: false });

    setArchivedProposals(propData || []);
    setArchivedCustomers(custData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Geri Yükleme (Restore)
  const handleRestore = async (table: 'proposals' | 'customers', id: string) => {
    const { error } = await supabase.from(table).update({ is_archived: false }).eq("id", id);
    
    if (error) toast.error("Geri yüklenemedi.");
    else {
      toast.success("Kayıt aktif listeye geri yüklendi! ♻️");
      fetchData(); // Listeyi yenile
    }
  };

  // Kalıcı Silme (Destroy)
  const handleDestroy = async (table: 'proposals' | 'customers', id: string) => {
    if(!confirm("DİKKAT: Bu işlem veriyi veritabanından TAMAMEN siler. Emin misiniz?")) return;
    
    // Eğer teklif siliyorsak önce finans kayıtlarını temizle
    if(table === 'proposals') {
        await supabase.from('transactions').delete().eq('proposal_id', id);
    }

    const { error } = await supabase.from(table).delete().eq("id", id);
    
    if (error) toast.error("Silinemedi: " + error.message);
    else {
      toast.success("Veri kalıcı olarak yok edildi.");
      fetchData();
    }
  };

  return (
    <div className="space-y-8 p-8">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white glow-text flex items-center gap-3">
            <Archive className="h-8 w-8 text-orange-500" /> Mezarlık
          </h1>
          <p className="text-slate-400 mt-1">Pasif durumdaki kayıtları incele veya geri yükle.</p>
        </div>
      </div>

      <Tabs defaultValue="proposals" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <TabsTrigger value="proposals" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-6 rounded-lg"><FileText className="w-4 h-4 mr-2"/> Teklifler ({archivedProposals.length})</TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 px-6 rounded-lg"><Users className="w-4 h-4 mr-2"/> Müşteriler ({archivedCustomers.length})</TabsTrigger>
        </TabsList>

        {/* TEKLİFLER TABLOSU */}
        <TabsContent value="proposals">
            <div className="glass-panel rounded-2xl overflow-hidden border-orange-500/30">
                <Table>
                    <TableHeader className="bg-slate-900/50">
                        <TableRow className="border-slate-800">
                            <TableHead className="text-slate-400">Teklif No</TableHead>
                            <TableHead className="text-slate-400">Müşteri</TableHead>
                            <TableHead className="text-slate-400">Tutar</TableHead>
                            <TableHead className="text-right text-slate-400">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center h-24 text-slate-500">Yükleniyor...</TableCell></TableRow> :
                         archivedProposals.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center h-24 text-slate-500">Arşivde teklif yok.</TableCell></TableRow> :
                         archivedProposals.map(p => (
                            <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="font-mono text-slate-300">{p.proposal_no}</TableCell>
                                <TableCell className="text-slate-300">{p.customers?.company_name}</TableCell>
                                <TableCell className="text-slate-300">{Number(p.total_amount).toLocaleString()} ₺</TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => handleRestore('proposals', p.id)} size="sm" variant="outline" className="mr-2 border-green-800 text-green-500 hover:bg-green-900/20"><RefreshCcw className="w-4 h-4 mr-2"/> Geri Yükle</Button>
                                    <Button onClick={() => handleDestroy('proposals', p.id)} size="sm" variant="ghost" className="text-red-500 hover:bg-red-900/20"><Trash2 className="w-4 h-4"/></Button>
                                </TableCell>
                            </TableRow>
                         ))}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>

        {/* MÜŞTERİLER TABLOSU */}
        <TabsContent value="customers">
            <div className="glass-panel rounded-2xl overflow-hidden border-orange-500/30">
                <Table>
                    <TableHeader className="bg-slate-900/50">
                        <TableRow className="border-slate-800">
                            <TableHead className="text-slate-400">Firma Adı</TableHead>
                            <TableHead className="text-slate-400">Yetkili</TableHead>
                            <TableHead className="text-slate-400">E-Posta</TableHead>
                            <TableHead className="text-right text-slate-400">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center h-24 text-slate-500">Yükleniyor...</TableCell></TableRow> :
                         archivedCustomers.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center h-24 text-slate-500">Arşivde müşteri yok.</TableCell></TableRow> :
                         archivedCustomers.map(c => (
                            <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="font-bold text-slate-300">{c.company_name}</TableCell>
                                <TableCell className="text-slate-300">{c.contact_person}</TableCell>
                                <TableCell className="text-slate-300">{c.email}</TableCell>
                                <TableCell className="text-right">
                                    <Button onClick={() => handleRestore('customers', c.id)} size="sm" variant="outline" className="mr-2 border-green-800 text-green-500 hover:bg-green-900/20"><RefreshCcw className="w-4 h-4 mr-2"/> Geri Yükle</Button>
                                    <Button onClick={() => handleDestroy('customers', c.id)} size="sm" variant="ghost" className="text-red-500 hover:bg-red-900/20"><Trash2 className="w-4 h-4"/></Button>
                                </TableCell>
                            </TableRow>
                         ))}
                    </TableBody>
                </Table>
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}