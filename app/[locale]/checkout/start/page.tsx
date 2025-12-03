"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function CheckoutStartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const planId = searchParams.get("plan");
  const [status, setStatus] = useState<"loading" | "preparing" | "redirecting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const startCheckout = async () => {
      // 1. Plan ID kontrolü
      if (!planId) {
        setStatus("error");
        setErrorMessage("Plan bilgisi bulunamadı");
        setTimeout(() => router.push("/pricing"), 2000);
        return;
      }

      setStatus("loading");

      try {
        // 2. Kullanıcı kontrolü
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setStatus("error");
          setErrorMessage("Oturum bulunamadı, giriş yapın");
          setTimeout(() => router.push(`/login?plan=${planId}`), 2000);
          return;
        }

        // 3. Organizasyon bilgisini al
        const { data: profile } = await supabase
          .from("profiles")
          .select("current_organization_id")
          .eq("id", user.id)
          .single();

        let organizationId = profile?.current_organization_id;

        if (!organizationId) {
          // Organizasyon henüz oluşmamış olabilir (trigger gecikmesi)
          // Birkaç saniye bekleyip tekrar dene
          setStatus("preparing");
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: retryProfile } = await supabase
            .from("profiles")
            .select("current_organization_id")
            .eq("id", user.id)
            .single();

          if (!retryProfile?.current_organization_id) {
            setStatus("error");
            setErrorMessage("Organizasyon oluşturulamadı, lütfen tekrar deneyin");
            setTimeout(() => router.push("/dashboard"), 3000);
            return;
          }

          organizationId = retryProfile.current_organization_id;
        }

        setStatus("redirecting");

        // 4. Stripe Checkout başlat
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId: planId,
            organizationId: organizationId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ödeme başlatılamadı");
        }

        // 5. Stripe'a yönlendir
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Ödeme URL'i alınamadı");
        }

      } catch (error: any) {
        console.error("Checkout error:", error);
        setStatus("error");
        setErrorMessage(error.message || "Bir hata oluştu");
        toast.error(error.message || "Ödeme başlatılamadı");
        
        // 3 saniye sonra pricing'e yönlendir
        setTimeout(() => router.push("/pricing"), 3000);
      }
    };

    startCheckout();
  }, [planId, router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-[#020617] dark:to-[#020617]">
      {/* Arka Plan Efektleri */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>

      {/* Checkout Kartı */}
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl text-center">
        
        {/* Loading State */}
        {status === "loading" && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Hesabınız Kontrol Ediliyor</h2>
              <p className="text-muted-foreground text-sm">Lütfen bekleyin...</p>
            </div>
          </div>
        )}

        {/* Preparing State */}
        {status === "preparing" && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="w-10 h-10 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Ödeme Hazırlanıyor</h2>
              <p className="text-muted-foreground text-sm">Organizasyonunuz oluşturuluyor...</p>
            </div>
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}

        {/* Redirecting State */}
        {status === "redirecting" && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Stripe'a Yönlendiriliyorsunuz</h2>
              <p className="text-muted-foreground text-sm">Güvenli ödeme sayfası açılıyor...</p>
            </div>
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Bir Sorun Oluştu</h2>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
            </div>
            <p className="text-xs text-muted-foreground">Yönlendiriliyorsunuz...</p>
          </div>
        )}

        {/* Güvenlik Notu */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Ödemeleriniz Stripe ile güvence altında</span>
          </div>
        </div>
      </div>
    </div>
  );
}

