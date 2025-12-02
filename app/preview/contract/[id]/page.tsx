"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContractTemplate from "@/components/templates/ContractTemplate"; // <--- Yeni Şablon

export default function ContractPreviewPage() {
  const params = useParams();
  const supabase = createClient();
  
  const [contract, setContract] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const id = params?.id as string;
      if (!id) return;

      // 1. Sözleşmeyi Çek
      const { data: contractData, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !contractData) {
        console.error("Sözleşme bulunamadı", error);
        setLoading(false);
        return;
      }

      setContract(contractData);

      // 2. Müşteriyi Çek
      const { data: custData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", contractData.customer_id)
        .single();

      setCustomer(custData);
      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  const handlePrint = () => { window.print(); };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /><span className="ml-2 text-slate-600">Sözleşme hazırlanıyor...</span></div>;
  if (!contract || !customer) return <div className="p-10 text-red-500">Veri bulunamadı.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white flex justify-center">
      
      {/* YAZDIRMA BUTONU */}
      <div className="fixed top-6 right-6 z-50 print:hidden">
        <Button onClick={handlePrint} size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-xl text-white">
          <Printer className="mr-2 h-5 w-5" /> PDF İndir / Yazdır
        </Button>
      </div>

      {/* ŞABLON */}
      <ContractTemplate contract={contract} customer={customer} />
      
    </div>
  );
}