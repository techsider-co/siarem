"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProposalTemplate from "@/components/templates/ProposalTemplate"; // <--- Yeni bileşen

export default function ProposalPreviewPage() {
  const params = useParams();
  const supabase = createClient();
  
  const [proposal, setProposal] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const secretKey = params?.id as string;
      if (!secretKey) return;

      if (!secretKey.startsWith("prop_")) {
        setError("Geçersiz Erişim Anahtarı.");
        setLoading(false);
        return;
      }

      const { data: propData, error: propError } = await supabase
        .from("proposals")
        .select("*").eq('is_archived', false)
        .eq("access_key", secretKey)
        .single();

      if (propError || !propData) {
        setError("Teklif bulunamadı.");
        setLoading(false);
        return;
      }

      setProposal(propData);

      if (propData.customer_id) {
        const { data: custData } = await supabase
          .from("customers")
          .select("*").eq('is_archived', false)
          .eq("id", propData.customer_id)
          .single();
        
        setCustomer(custData);
      }
      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  const handlePrint = () => { window.print(); };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /><span className="ml-2 text-slate-600">Yükleniyor...</span></div>;
  
  if (error || !proposal || !customer) return <div className="text-red-500 font-bold p-10">{error || "Veri yok."}</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white flex justify-center">
      
      {/* BUTON */}
      <div className="fixed top-6 right-6 z-50 print:hidden">
        <Button onClick={handlePrint} size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-xl text-white">
          <Printer className="mr-2 h-5 w-5" /> PDF İndir / Yazdır
        </Button>
      </div>

      {/* ŞABLON */}
      <ProposalTemplate proposal={proposal} customer={customer} />
      
    </div>
  );
}