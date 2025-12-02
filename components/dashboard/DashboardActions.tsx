"use client";

import { useState, useEffect } from "react";
import { Link, useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { DEFAULT_CONTRACT_CLAUSES } from "@/lib/constants";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Send,
  Trash2,
  Eye,
  Briefcase,
  Archive,
  FileSignature,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// STANDART GÖREVLER
const STANDARD_TASKS = [
  { title: "Domain & Hosting Kurulumu", status: "todo", priority: "high" },
  { title: "Tasarım (UI/UX) Onayı", status: "todo", priority: "high" },
  { title: "Anasayfa Kodlaması", status: "todo", priority: "medium" },
  { title: "Mobil Uyumluluk Testi", status: "todo", priority: "medium" },
  { title: "SEO Ayarları & Sitemap", status: "todo", priority: "low" },
];

export function DashboardActions({ proposal }: { proposal: any }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);

  // --- YENİ: PROJE TESLİM TARİHİ STATE'İ ---
  // Varsayılan olarak bugüne 7 gün ekle
  const [deadlineDate, setDeadlineDate] = useState("");

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default 7 Gün
    setDeadlineDate(date.toISOString().split("T")[0]);
  }, []);
  // -----------------------------------------

  const updateStatus = async (newStatus: string) => {
    if (newStatus === "accepted") {
      setShowContractDialog(true);
      return;
    }
    await performStatusUpdate(newStatus);
  };

  const performStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("proposals")
      .update({ status: newStatus })
      .eq("id", proposal.id);

    if (error) {
      toast.error("Hata oluştu: " + error.message);
      setLoading(false);
      return;
    }

    if (newStatus === "completed") {
      // @ts-ignore
      const companyName = proposal.customers?.company_name || "Müşteri";
      const localDate = new Date();
      const formattedDate = `${localDate.getFullYear()}-${String(
        localDate.getMonth() + 1
      ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

      const { error: transError } = await supabase.from("transactions").insert([
        {
          description: `${companyName} - Proje Geliri (Oto)`,
          amount: proposal.total_amount,
          type: "income",
          category: "project",
          date: formattedDate,
          proposal_id: proposal.id,
        },
      ]);

      if (!transError)
        toast.success("✅ Tutar Finans tablosuna 'GELİR' olarak işlendi!");
    } else {
      toast.success(`Durum güncellendi: ${newStatus.toUpperCase()}`);
    }
    router.refresh();
    setLoading(false);
  };

  // --- OTOMATİK OLUŞTURUCU (GÜNCELLENDİ) ---
  const createAutoContract = async () => {
    setLoading(true);
    await performStatusUpdate("accepted");

    const contractNo = `CNT-${proposal.proposal_no}`;
    const { error: contractError } = await supabase.from("contracts").insert([
      {
        proposal_id: proposal.id,
        customer_id: proposal.customer_id,
        contract_no: contractNo,
        content: { clauses: DEFAULT_CONTRACT_CLAUSES },
        status: "draft",
      },
    ]);

    // @ts-ignore
    const companyName = proposal.customers?.company_name || "Proje";

    // PROJE OLUŞTURURKEN ARTIK SEÇİLEN TARİHİ KULLANIYORUZ
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert([
        {
          name: `${companyName} Web Projesi`,
          customer_id: proposal.customer_id,
          proposal_id: proposal.id,
          status: "active",
          progress: 0,
          deadline: deadlineDate, // <--- DİNAMİK TARİH BURADA
        },
      ])
      .select()
      .single();

    if (projectData) {
      const tasksToInsert = STANDARD_TASKS.map((task) => ({
        project_id: projectData.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      }));
      await supabase.from("tasks").insert(tasksToInsert);
    }

    if (!contractError && !projectError) {
      toast.success("Sözleşme ve Proje Panosu hazır! 🚀");
      router.push("/projects");
    } else {
      toast.error("Bir şeyler ters gitti.");
    }
    setShowContractDialog(false);
    setLoading(false);
  };

  const goToManualContract = async () => {
    await performStatusUpdate("accepted");
    router.push(`/contracts/create?proposalId=${proposal.id}`);
  };

  const skipContract = async () => {
    await performStatusUpdate("accepted");
    setShowContractDialog(false);
  };

  const handleArchive = async () => {
    if (!confirm("Arşivlemek istiyor musunuz?")) return;
    const { error } = await supabase
      .from("proposals")
      .update({ is_archived: true })
      .eq("id", proposal.id);
    if (!error) {
      toast.success("Arşivlendi.");
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("KALICI SİLİNSİN Mİ?")) return;
    await supabase.from("transactions").delete().eq("proposal_id", proposal.id);
    const { error } = await supabase
      .from("proposals")
      .delete()
      .eq("id", proposal.id);
    if (!error) {
      toast.success("Silindi.");
      router.refresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-slate-900 border-slate-700 text-slate-200 w-56"
        >
          <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider ml-2">
            İşlemler
          </DropdownMenuLabel>
          <Link
            href={`/preview/proposal/${proposal.access_key}`}
            target="_blank"
          >
            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800">
              <Eye className="mr-2 h-4 w-4 text-blue-400" /> PDF Önizle
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem
            onClick={() => updateStatus("sent")}
            className="hover:bg-slate-800"
          >
            <Send className="mr-2 h-4 w-4 text-blue-500" /> Gönderildi
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateStatus("accepted")}
            className="hover:bg-slate-800"
          >
            <CheckCircle className="mr-2 h-4 w-4 text-indigo-500" /> Onaylandı
            (Başla)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateStatus("completed")}
            className="hover:bg-slate-800"
          >
            <Briefcase className="mr-2 h-4 w-4 text-green-500" /> Tamamlandı
            (Kasa)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateStatus("rejected")}
            className="hover:bg-slate-800"
          >
            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reddedildi
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem
            onClick={handleArchive}
            className="text-orange-400 hover:bg-slate-800"
          >
            <Archive className="mr-2 h-4 w-4" /> Arşivle
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-500 hover:bg-slate-800"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileSignature className="w-6 h-6 text-green-500" /> Proje
              Başlatılıyor
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-slate-300 text-sm">
              Teklif onaylandı. Hizmet sözleşmesi ve proje panosu oluşturulacak.
            </p>

            {/* TARİH SEÇİCİ (YENİ) */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <Label className="text-xs uppercase text-blue-400 font-bold mb-2 block">
                Proje Teslim Tarihi
              </Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <Input
                  type="date"
                  className="bg-slate-950 border-slate-700 text-white h-9"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={createAutoContract}
                className="bg-green-600 hover:bg-green-500 text-white justify-start h-auto py-3 px-4 rounded-xl border border-green-500/50"
              >
                <div className="text-left">
                  <div className="font-bold text-base">Evet, Başlat</div>
                  <div className="text-xs text-green-100 opacity-80">
                    Sözleşme + Proje Panosu (Seçilen Tarih)
                  </div>
                </div>
              </Button>
              <Button
                onClick={goToManualContract}
                variant="secondary"
                className="bg-slate-800 hover:bg-slate-700 text-white justify-start h-auto py-3 px-4 rounded-xl border border-slate-700"
              >
                <div className="text-left">
                  <div className="font-bold text-base">
                    Sözleşmeyi Manuel Düzenle
                  </div>
                </div>
              </Button>
              <Button
                onClick={skipContract}
                variant="ghost"
                className="text-slate-500 hover:text-white justify-center mt-2 hover:bg-slate-800"
              >
                Hayır, Sadece Durumu Güncelle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
