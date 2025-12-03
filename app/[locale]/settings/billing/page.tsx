// settings/billing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ArrowUpRight,
  Zap,
  Rocket,
  Sparkles,
  Crown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/utils/supabase/client";
import type { ProductWithPrices } from "@/lib/stripe";

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  stripe_invoice_number: string | null;
  stripe_hosted_invoice_url: string | null;
  stripe_invoice_pdf: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  plan_name: string | null;
  created_at: string;
}

interface SubscriptionInfo {
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  status: string;
  plan: string;
  interval?: string;
  priceId?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const { currentOrg, userRole, refreshOrganizations } = useOrganization();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [orgDetails, setOrgDetails] = useState<any>(null);

  const canManageBilling = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    if (currentOrg) {
      fetchAllData();
    }
  }, [currentOrg]);

  const fetchAllData = async () => {
    if (!currentOrg) return;
    setLoading(true);

    try {
      // 1. Organizasyon detaylarını al
      const { data: org } = await supabase
        .from("organizations")
        .select(`
          subscription_plan,
          subscription_status,
          current_period_end,
          cancel_at_period_end,
          payment_status,
          stripe_subscription_id,
          stripe_price_id
        `)
        .eq("id", currentOrg.id)
        .single();

      if (org) {
        setOrgDetails(org);
      }

      // 2. Stripe'dan canlı abonelik bilgisini çek
      const subRes = await fetch("/api/stripe/subscription-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrg.id }),
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscriptionInfo(subData);
      }

      // 3. Stripe ürünlerini çek
      const productsRes = await fetch("/api/stripe/products");
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }

      // 4. Faturaları al
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (invoicesData) {
        setInvoices(invoicesData as Invoice[]);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!currentOrg) return;
    setPortalLoading(true);

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
      toast.error(error.message || "Portal açılamadı");
    } finally {
      setPortalLoading(false);
    }
  };

  const formatPrice = (price: number | null, currency: string = "usd") => {
    if (!price) return "Ücretsiz";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Mevcut planı Stripe ürünlerinden bul
  const activePriceId = subscriptionInfo?.priceId || orgDetails?.stripe_price_id;
  const currentProduct = products.find(product =>
    product.prices.some(price => price.id === activePriceId)
  );
  const currentPrice = currentProduct?.prices.find(p => p.id === activePriceId);

  // Durum konfigürasyonu
  const getStatusConfig = () => {
    const status = subscriptionInfo?.status || orgDetails?.subscription_status;
    const cancelAtPeriodEnd = subscriptionInfo?.cancelAtPeriodEnd || orgDetails?.cancel_at_period_end;
    const paymentStatus = orgDetails?.payment_status;

    // Ödeme başarısız
    if (paymentStatus === 'failed' || status === 'past_due') {
      return {
        label: "Ödeme Alınamadı",
        color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        icon: <AlertCircle className="h-4 w-4" />,
        type: "error"
      };
    }

    // İptal edilecek
    if (cancelAtPeriodEnd && status === 'active') {
      return {
        label: "İptal Edilecek",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        icon: <Clock className="h-4 w-4" />,
        type: "warning"
      };
    }

    // İptal edildi
    if (status === 'canceled') {
      return {
        label: "İptal Edildi",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        icon: <XCircle className="h-4 w-4" />,
        type: "inactive"
      };
    }

    // Deneme süresi
    if (status === 'trialing') {
      return {
        label: "Deneme Süresi",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        icon: <Clock className="h-4 w-4" />,
        type: "trial"
      };
    }

    // Aktif
    if (status === 'active') {
      return {
        label: "Aktif",
        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        icon: <CheckCircle className="h-4 w-4" />,
        type: "active"
      };
    }

    // Ücretsiz / Varsayılan
    return {
      label: "Ücretsiz",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      icon: <Zap className="h-4 w-4" />,
      type: "free"
    };
  };

  const statusConfig = getStatusConfig();
  const displayPlan = subscriptionInfo?.plan || orgDetails?.subscription_plan || 'free';
  const isFreePlan = displayPlan === 'free';

  // Plan badge bileşeni
  const PlanBadge = ({ plan }: { plan: string }) => {
    const styles: Record<string, { label: string; className: string; icon: any }> = {
      free: { label: "Ücretsiz", className: "bg-gray-100 text-gray-700 dark:bg-gray-800", icon: Zap },
      starter: { label: "Başlangıç", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30", icon: Rocket },
      pro: { label: "Profesyonel", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30", icon: Sparkles },
      enterprise: { label: "Kurumsal", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30", icon: Crown },
    };
    const config = styles[plan.toLowerCase()] || styles.free;
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Faturalama</h1>
        <p className="text-muted-foreground">
          Abonelik durumunuzu ve fatura geçmişinizi görüntüleyin
        </p>
      </div>

      {/* Ödeme Hatası Uyarısı */}
      {statusConfig.type === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div className="flex-1">
            <p className="font-medium text-red-900 dark:text-red-200">Ödeme Alınamadı</p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Son ödemeniz başarısız oldu. Lütfen ödeme yönteminizi güncelleyin.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleManageSubscription}>
            Ödeme Yöntemini Güncelle
          </Button>
        </div>
      )}

      {/* Mevcut Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Mevcut Plan
                <PlanBadge plan={displayPlan} />
              </CardTitle>
              <CardDescription>Organizasyonunuzun abonelik bilgileri</CardDescription>
            </div>
          </div>
          <Badge className={statusConfig.color}>
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.label}</span>
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Bilgisi */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="text-xl font-semibold">
                {currentProduct?.name || (isFreePlan ? "Ücretsiz Plan" : displayPlan.charAt(0).toUpperCase() + displayPlan.slice(1))}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentProduct?.description || "Temel özellikler"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {currentPrice ? formatPrice(currentPrice.unit_amount, currentPrice.currency) : "Ücretsiz"}
                {currentPrice && (
                  <span className="text-base font-normal text-muted-foreground">
                    /{subscriptionInfo?.interval === 'year' ? 'yıl' : 'ay'}
                  </span>
                )}
              </div>
              {subscriptionInfo?.interval && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subscriptionInfo.interval === 'year' ? 'Yıllık' : 'Aylık'} faturalandırma
                </p>
              )}
            </div>
          </div>

          {/* Abonelik Detayları */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* Sonraki Fatura Tarihi */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Sonraki Fatura
              </p>
              <p className="font-medium">
                {subscriptionInfo?.currentPeriodEnd
                  ? formatDate(subscriptionInfo.currentPeriodEnd)
                  : isFreePlan
                    ? "Süresiz"
                    : "-"
                }
              </p>
              {subscriptionInfo?.currentPeriodEnd && !subscriptionInfo?.cancelAtPeriodEnd && (
                <p className="text-xs text-muted-foreground">Otomatik yenilenecek</p>
              )}
            </div>

            {/* Plan Özellikleri */}
            {currentProduct?.features && currentProduct.features.length > 0 && (
              <div className="space-y-1 col-span-2">
                <p className="text-sm text-muted-foreground">Plan Özellikleri</p>
                <div className="flex flex-wrap gap-2">
                  {currentProduct.features.slice(0, 4).map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {currentProduct.features.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentProduct.features.length - 4} daha
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* İptal Uyarısı */}
          {subscriptionInfo?.cancelAtPeriodEnd && subscriptionInfo?.currentPeriodEnd && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Aboneliğiniz iptal edildi
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {formatDate(subscriptionInfo.currentPeriodEnd)} tarihine kadar kullanmaya devam edebilirsiniz. 
                  Bu tarihten sonra ücretsiz plana geçiş yapılacaktır.
                </p>
              </div>
            </div>
          )}

          {/* Aksiyon Butonları */}
          {canManageBilling && (
            <div className="flex flex-wrap gap-3 pt-2">
              {isFreePlan || !orgDetails?.stripe_subscription_id ? (
                <Button onClick={() => router.push("/pricing")}>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Planı Yükselt
                </Button>
              ) : (
                <>
                  <Button onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    Ödeme Yönetimi
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/settings/organization")}>
                    Plan Değiştir
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fatura Geçmişi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fatura Geçmişi
          </CardTitle>
          <CardDescription>Son 10 faturanız</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Henüz fatura bulunmuyor</p>
              {isFreePlan && (
                <p className="text-sm mt-2">
                  Ücretli bir plana geçtiğinizde faturalarınız burada görünecek
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Dönem</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.stripe_invoice_number || "-"}
                    </TableCell>
                    <TableCell>{formatDate(invoice.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </TableCell>
                    <TableCell>{formatPrice(invoice.amount_paid, invoice.currency)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={
                          invoice.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "open"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }
                      >
                        {invoice.status === "paid" ? "Ödendi" : 
                         invoice.status === "open" ? "Bekliyor" : invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.stripe_hosted_invoice_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={invoice.stripe_hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Faturayı Görüntüle"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {invoice.stripe_invoice_pdf && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={invoice.stripe_invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="PDF İndir"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Yardım */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Faturalama ile ilgili sorunuz mu var?{" "}
          <a href="/contact" className="text-primary hover:underline">
            Destek ekibimizle iletişime geçin
          </a>
        </p>
      </div>
    </div>
  );
}
