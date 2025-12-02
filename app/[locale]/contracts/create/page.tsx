"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { Save, ArrowLeft, FileText, GripVertical } from "lucide-react";
import { DEFAULT_CONTRACT_CLAUSES } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CreateContractContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrg } = useOrganization();
  
  const proposalId = searchParams.get("proposalId");
  
  const [customer, setCustomer] = useState<any>(null);
  const [contractNo, setContractNo] = useState("");
  const [clauses, setClauses] = useState(DEFAULT_CONTRACT_CLAUSES);

  useEffect(() => {
    const init = async () => {
      if (!proposalId) return;

      // Teklif ve Müşteri Bilgisini Çek
      const { data: proposal } = await supabase
        .from("proposals")
        .select("*, customers(*)")
        .eq("id", proposalId)
        .single();

      if (proposal) {
        setCustomer(proposal.customers);
        // Sözleşme No Üret: CNT-2025-PROPOSALNO
        setContractNo(`CNT-${proposal.proposal_no}`);
      }
    };
    init();
  }, [proposalId]);

  const handleClauseChange = (index: number, field: "title" | "content", value: string) => {
    const newClauses = [...clauses];
    newClauses[index][field] = value;
    setClauses(newClauses);
  };

  const handleSave = async () => {
    if (!proposalId || !customer) return;
    if (!currentOrg) {
      toast.error("Organizasyon bulunamadı.");
      return;
    }

    const { data, error } = await supabase.from("contracts").insert([
        {
            organization_id: currentOrg.id,
            proposal_id: proposalId,
            customer_id: customer.id,
            contract_no: contractNo,
            content: { clauses }, // Tüm maddeleri JSON olarak kaydet
            status: "draft"
        }
    ]).select();

    if (error) {
        toast.error("Hata: " + error.message);
    } else {
        toast.success("Sözleşme oluşturuldu! 📜");
        // Önizlemeye git (ID ile)
        // router.push(`/preview/contract/${data[0].id}`); 
        // Şimdilik listeye dönelim veya dashboarda
        router.push("/");
    }
  };

  if (!proposalId) return <div className="p-10 text-foreground">Teklif ID bulunamadı.</div>;

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto p-8">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-card/80 dark:bg-slate-950/80 p-4 rounded-xl border border-border sticky top-4 z-50 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sözleşme Editörü</h1>
            <p className="text-xs text-muted-foreground">{customer ? customer.company_name : 'Yükleniyor...'} için sözleşme hazırla.</p>
          </div>
        </div>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/25">
          <Save className="mr-2 h-4 w-4" /> Sözleşmeyi Oluştur
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-foreground">Genel Bilgiler</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-muted-foreground">Sözleşme No</Label>
                <Input className="bg-muted/50 border-border text-foreground" value={contractNo} onChange={(e) => setContractNo(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label className="text-muted-foreground">Müşteri</Label>
                <Input className="bg-muted/30 border-border text-muted-foreground" value={customer?.company_name || ''} disabled />
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Sözleşme Maddeleri</h3>
          {clauses.map((clause, i) => (
              <div key={i} className="bg-muted/30 dark:bg-slate-900/50 border border-border p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                      <GripVertical className="text-muted-foreground cursor-move" />
                      <Input 
                        value={clause.title} 
                        onChange={(e) => handleClauseChange(i, "title", e.target.value)}
                        className="bg-white dark:bg-slate-950 border-border text-foreground font-bold"
                      />
                  </div>
                  <Textarea 
                    value={clause.content} 
                    onChange={(e) => handleClauseChange(i, "content", e.target.value)}
                    className="bg-white dark:bg-slate-950 border-border text-muted-foreground h-32 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">*HTML etiketi kullanabilirsiniz (b, strong, ul, li...)</p>
              </div>
          ))}
      </div>
    </div>
  );
}

export default function CreateContractPage() {
    return (
        <Suspense fallback={<div className="p-10 text-foreground">Yükleniyor...</div>}>
            <CreateContractContent />
        </Suspense>
    )
}
