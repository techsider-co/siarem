"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Zap, Building2, Rocket, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/utils/supabase/client";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  max_users: number;
  max_projects: number;
  max_customers: number;
  max_proposals_per_month: number;
  max_storage_mb: number;
  features: string[];
  is_popular: boolean;
  sort_order: number;
}

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  starter: <Rocket className="h-6 w-6" />,
  pro: <Building2 className="h-6 w-6" />,
  enterprise: <Crown className="h-6 w-6" />,
};

const planColors: Record<string, string> = {
  free: "from-slate-500 to-slate-600",
  starter: "from-blue-500 to-blue-600",
  pro: "from-violet-500 to-purple-600",
  enterprise: "from-amber-500 to-orange-600",
};

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrg, userRole } = useOrganization();
  const supabase = createClient();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");

  // Planları yükle
  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) {
        setPlans(data as Plan[]);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  // Mevcut planı al
  useEffect(() => {
    if (currentOrg?.subscription_plan) {
      setCurrentPlan(currentOrg.subscription_plan);
    }
  }, [currentOrg]);

  // URL parametresinden ödeme durumunu kontrol et
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "cancelled") {
      toast.info("Ödeme işlemi iptal edildi");
    }
  }, [searchParams]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const handleCheckout = async (plan: Plan) => {
    if (!currentOrg) {
      toast.error("Lütfen önce bir organizasyon seçin");
      return;
    }

    if (!userRole || !["owner", "admin"].includes(userRole)) {
      toast.error("Abonelik yönetimi için yetkiniz yok");
      return;
    }

    const priceId = isYearly ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;

    if (!priceId) {
      toast.error("Bu plan için fiyat bilgisi bulunamadı");
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          organizationId: currentOrg.id,
          billingPeriod: isYearly ? "yearly" : "monthly",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ödeme başlatılamadı");
      }

      // Stripe Checkout sayfasına yönlendir
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!currentOrg) return;

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrg.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            İşletmeniz için doğru planı seçin
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tüm planlar 14 gün ücretsiz deneme ile başlar. Kredi kartı gerekmez.
          </p>

          {/* Aylık/Yıllık Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
              Aylık
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
              Yıllık
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                2 ay bedava
              </Badge>
            </Label>
          </div>
        </div>

        {/* Mevcut Abonelik Bilgisi */}
        {currentOrg && currentPlan !== "free" && (
          <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Mevcut planınız: <span className="font-semibold text-foreground">{plans.find(p => p.id === currentPlan)?.name}</span>
            </p>
            <Button variant="link" onClick={handleManageSubscription} className="text-primary">
              Aboneliği yönet →
            </Button>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = isYearly ? plan.price_yearly : plan.price_monthly;
            const isCurrentPlan = currentPlan === plan.id;
            const isFree = plan.id === "free";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.is_popular
                    ? "border-primary shadow-lg scale-105 z-10"
                    : "border-border"
                } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4">
                      En Popüler
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-background">
                      Mevcut Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-12 h-12 rounded-full bg-linear-to-br ${planColors[plan.id]} flex items-center justify-center text-white mb-4`}>
                    {planIcons[plan.id]}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  {/* Fiyat */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        {isFree ? "Ücretsiz" : formatPrice(price, plan.currency)}
                      </span>
                      {!isFree && (
                        <span className="text-muted-foreground">
                          /{isYearly ? "yıl" : "ay"}
                        </span>
                      )}
                    </div>
                    {isYearly && !isFree && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(plan.price_monthly, plan.currency)}/ay yerine
                      </p>
                    )}
                  </div>

                  {/* Limitler */}
                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kullanıcı</span>
                      <span className="font-medium">
                        {plan.max_users === -1 ? "Sınırsız" : plan.max_users}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proje</span>
                      <span className="font-medium">
                        {plan.max_projects === -1 ? "Sınırsız" : plan.max_projects}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Müşteri</span>
                      <span className="font-medium">
                        {plan.max_customers === -1 ? "Sınırsız" : plan.max_customers}
                      </span>
                    </div>
                  </div>

                  {/* Özellikler */}
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  {isFree ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={isCurrentPlan}
                    >
                      {isCurrentPlan ? "Mevcut Plan" : "Ücretsiz Başla"}
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleManageSubscription}
                    >
                      Planı Yönet
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${plan.is_popular ? "bg-primary" : ""}`}
                      variant={plan.is_popular ? "default" : "outline"}
                      onClick={() => handleCheckout(plan)}
                      disabled={checkoutLoading === plan.id}
                    >
                      {checkoutLoading === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Yönlendiriliyor...
                        </>
                      ) : (
                        "Satın Al"
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ veya ek bilgiler */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Sorularınız mı var?{" "}
            <a href="/contact" className="text-primary hover:underline">
              Bizimle iletişime geçin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

