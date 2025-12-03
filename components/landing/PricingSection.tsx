"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter as useNextRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProductWithPrices } from "@/lib/stripe";
import { useUser } from "@/hooks/useUser";
import { PLANS } from "@/config/subscriptions";

interface PricingSectionProps {
  products: ProductWithPrices[];
  currency?: string;
}

// Static Free Plan that doesn't exist in Stripe
const FREE_PLAN: ProductWithPrices = {
  id: "free",
  name: "Ücretsiz",
  description: "Başlamak için ideal",
  features: [
    "1 Kullanıcı",
    "3 Teklif",
    "3 Proje",
    "50 Müşteri",
    "Temel Destek",
  ],
  prices: [
    { id: "free_monthly", unit_amount: 0, currency: "try", interval: "month" },
    { id: "free_yearly", unit_amount: 0, currency: "try", interval: "year" },
  ],
  metadata: {
    plan_id: "free",
    order: "0",
  },
};

export function PricingSection({ products, currency = "try" }: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const router = useNextRouter();
  
  const { user, isLoading: userLoading } = useUser();

  // Inject Free Plan at the beginning
  const allProducts = useMemo(() => {
    // Update free plan currency
    const freePlanWithCurrency: ProductWithPrices = {
      ...FREE_PLAN,
      prices: [
        { id: "free_monthly", unit_amount: 0, currency, interval: "month" },
        { id: "free_yearly", unit_amount: 0, currency, interval: "year" },
      ],
    };

    // Check if products already contain a free plan
    const hasFreePlan = products.some(
      (p) => p.id === "free" || p.name.toLowerCase().includes("free") || p.name.toLowerCase().includes("ücretsiz")
    );

    if (hasFreePlan) {
      return products;
    }

    return [freePlanWithCurrency, ...products];
  }, [products, currency]);

  const handleSelectPlan = async (priceId: string, isFree: boolean = false) => {
    setLoadingPriceId(priceId);

    // Free Plan Logic
    if (isFree) {
      if (user) {
        // Logged in -> go to dashboard
        router.push("/dashboard");
      } else {
        // Not logged in -> go to register
        router.push("/register");
      }
      return;
    }

    // Paid Plan Logic
    if (!user) {
      router.push(`/register?plan=${priceId}`);
      return;
    }

    try {
      router.push(`/checkout/start?plan=${priceId}`);
    } catch (error) {
      toast.error("Bir hata oluştu");
      setLoadingPriceId(null);
    }
  };

  // Determine grid columns based on product count
  const gridCols = allProducts.length <= 3 
    ? "md:grid-cols-3" 
    : allProducts.length === 4 
      ? "md:grid-cols-2 lg:grid-cols-4" 
      : "md:grid-cols-3";

  return (
    <section id="pricing" className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Şeffaf Fiyatlandırma
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Planlar ve Fiyatlandırma
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            İhtiyacınıza en uygun paketi seçin. İstediğiniz zaman yükseltin veya iptal edin.
          </p>
          
          {/* Toggle */}
          <div className="inline-flex items-center p-1 bg-muted rounded-full border border-border">
            <button
              onClick={() => setBillingPeriod("month")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingPeriod === "month" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Aylık
            </button>
            <button
              onClick={() => setBillingPeriod("year")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                billingPeriod === "year" 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yıllık <span className="text-xs text-green-500 ml-1 font-bold">(-20%)</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className={cn("grid gap-8 max-w-7xl mx-auto", gridCols)}>
          {allProducts.map((product, index) => {
            const price = product.prices.find((p) => p.interval === billingPeriod);
            if (!price) return null;

            const isFree = product.id === "free" || price.unit_amount === 0;
            const isPopular = product.metadata?.highlight === "true" || 
                              product.name.toLowerCase().includes('pro') || 
                              product.name === 'Profesyonel';
            const amount = price.unit_amount ? price.unit_amount / 100 : 0;

            return (
              <div 
                key={product.id}
                className={cn(
                  "relative flex flex-col p-8 rounded-3xl border transition-all duration-300",
                  isPopular
                    ? "border-primary shadow-2xl bg-card scale-105 z-10" 
                    : "border-border bg-card/50 hover:border-primary/50",
                  isFree && "bg-muted/30"
                )}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    EN POPÜLER
                  </div>
                )}

                {/* Free Badge */}
                {isFree && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                    ÜCRETSİZ BAŞLA
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold">{product.name}</h3>
                  <p className="text-muted-foreground mt-2 h-10">{product.description}</p>
                </div>

                <div className="mb-6">
                  {isFree ? (
                    <>
                      <span className="text-4xl font-bold">₺0</span>
                      <span className="text-muted-foreground">/sonsuza kadar</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">
                        {new Intl.NumberFormat('tr-TR', { 
                          style: 'currency', 
                          currency: price.currency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(amount)}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingPeriod === 'month' ? 'ay' : 'yıl'}
                      </span>
                    </>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {product.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "p-1 rounded-full mt-0.5",
                        isFree 
                          ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-primary/10 text-primary"
                      )}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleSelectPlan(price.id, isFree)}
                  disabled={loadingPriceId === price.id || userLoading}
                  variant={isPopular ? 'default' : isFree ? 'secondary' : 'outline'}
                  className={cn(
                    "w-full h-12 rounded-xl font-semibold",
                    isFree && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                >
                  {loadingPriceId === price.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFree ? (
                    user ? "Dashboard'a Git" : "Ücretsiz Başla"
                  ) : (
                    "Hemen Başla"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            ✓ Kredi kartı gerektirmez &nbsp;•&nbsp; ✓ İstediğiniz zaman iptal edin &nbsp;•&nbsp; ✓ 14 gün ücretsiz deneme
          </p>
        </div>
      </div>
    </section>
  );
}
