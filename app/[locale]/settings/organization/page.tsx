// settings/organization/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import type { ProductWithPrices } from "@/lib/stripe";
import {
  Building2,
  Save,
  Globe,
  Link2,
  Image,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Shield,
  Crown,
  CreditCard,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Zap,
  Rocket,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrganizationSettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { currentOrg, userRole, refreshOrganizations, isLoading: orgLoading } = useOrganization();
  
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  
  // Stripe abonelik bilgileri (doğrudan Stripe'dan çekilecek)
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    status: string;
    plan: string;
    interval?: string;
    priceId?: string;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  
  // Form State
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [originalSlug, setOriginalSlug] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo_url: "",
    website: "",
  });

  // Yetki kontrolü
  const canEdit = userRole === "owner" || userRole === "admin";
  const isOwner = userRole === "owner";

  // Verileri Yükle
  useEffect(() => {
    if (currentOrg) {
      setForm({
        name: currentOrg.name || "",
        slug: currentOrg.slug || "",
        logo_url: currentOrg.logo_url || "",
        website: "",
      });
      setOriginalSlug(currentOrg.slug || "");
      fetchOrgDetails();
    }
  }, [currentOrg?.id]);

  // Stripe ürünlerini çek
  useEffect(() => {
    fetchStripeProducts();
  }, []);

  // Stripe abonelik bilgilerini çek
  useEffect(() => {
    if (currentOrg?.id) {
      fetchSubscriptionInfo();
    }
  }, [currentOrg?.id]);

  const fetchSubscriptionInfo = async () => {
    if (!currentOrg) return;
    
    setSubscriptionLoading(true);
    try {
      const res = await fetch("/api/stripe/subscription-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrg.id }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubscriptionInfo(data);
        
        // Aktif aboneliğin interval'ına göre toggle'ı ayarla
        if (data.interval === 'year' || data.interval === 'month') {
          setBillingPeriod(data.interval);
        }
      }
    } catch (error) {
      console.error("Failed to fetch subscription info:", error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchOrgDetails = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("organizations")
      .select("website")
      .eq("id", currentOrg.id)
      .single();
    if (data) setForm(prev => ({ ...prev, website: data.website || "" }));
  };

  const fetchStripeProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch("/api/stripe/products");
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Slug Kontrolü
  useEffect(() => {
    if (!form.slug || form.slug === originalSlug) {
      setSlugAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", form.slug.toLowerCase())
        .neq("id", currentOrg?.id || "")
        .single();
      setSlugAvailable(!data);
      setCheckingSlug(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug, originalSlug]);

  const handleSlugChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    setForm(prev => ({ ...prev, slug: formatted }));
  };

  // GENEL AYARLARI KAYDET
  const handleSave = async () => {
    if (!currentOrg || !canEdit) return;
    if (!form.name.trim()) return toast.error("Organizasyon adı zorunludur");
    if (!form.slug.trim()) return toast.error("URL kısayolu zorunludur");
    if (form.slug !== originalSlug && slugAvailable === false) return toast.error("URL kısayolu kullanımda");

    setLoading(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: form.name.trim(),
        slug: form.slug.toLowerCase(),
        logo_url: form.logo_url.trim() || null,
        website: form.website.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentOrg.id);

    if (error) toast.error(error.message);
    else {
      toast.success("Ayarlar güncellendi");
      setOriginalSlug(form.slug);
      await refreshOrganizations();
    }
    setLoading(false);
  };

  // STRIPE PORTAL YÖNLENDİRME
  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrg?.id }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || "Portal açılamadı");
    } catch (error: any) {
      toast.error("Fatura portalı açılamadı: " + error.message);
    } finally {
      setPortalLoading(false);
    }
  };

  // YENİ PLAN SEÇİMİ - Checkout'a yönlendir veya mevcut aboneliği güncelle
  const handleUpgrade = async (priceId: string) => {
    if (!currentOrg || !priceId) return;

    setCheckoutLoading(priceId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          organizationId: currentOrg.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ödeme başlatılamadı");
      }

      // Farklı response tiplerine göre işlem yap
      if (data.type === 'subscription_updated') {
        // Mevcut abonelik güncellendi - toast göster ve context'i yenile
        toast.success(data.message || "Planınız başarıyla güncellendi!");
        await refreshOrganizations();
        
        // Sayfayı yeniden yükle veya redirect et
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } else if (data.type === 'checkout_session' && data.url) {
        // Yeni abonelik için Stripe Checkout'a yönlendir
        window.location.href = data.url;
      } else if (data.url) {
        // Fallback: eski format
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Fiyat formatla
  const formatPrice = (amount: number | null, currency: string = "usd") => {
    if (!amount) return "Ücretsiz";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Tarih formatla
  const formatDate = (date: string | null) => {
    if (!date) return "Süresiz";
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Plan Badge Component
  const PlanBadge = ({ plan }: { plan: string }) => {
    const styles: Record<string, { label: string; className: string; icon: any }> = {
      free: { label: "Ücretsiz", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: Zap },
      starter: { label: "Başlangıç", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Rocket },
      pro: { label: "Profesyonel", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: Sparkles },
      enterprise: { label: "Kurumsal", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Crown },
    };
    const config = styles[plan] || styles.free;
    const Icon = config.icon;
    return (
      <Badge className={`${config.className} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // LOADING STATE
  if (orgLoading || !currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // YETKİ YOKSA
  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center p-8">
        <Shield className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">Erişim Kısıtlı</h2>
        <p className="text-muted-foreground">Bu sayfayı sadece yöneticiler görebilir.</p>
      </div>
    );
  }

  // Mevcut aboneliğin price ID'sini al (önce subscriptionInfo'dan, yoksa currentOrg'dan)
  const activePriceId = subscriptionInfo?.priceId || currentOrg.stripe_price_id;
  
  // Mevcut plan detaylarını bul - önce stripe_price_id ile eşleştir
  const currentProduct = products.find(product => 
    product.prices.some(price => price.id === activePriceId)
  ) || products.find(p => {
    // Fallback: plan ismi ile eşleştir
    const productName = p.name.toLowerCase();
    const currentPlan = currentOrg.subscription_plan?.toLowerCase() || 'free';
    return productName.includes(currentPlan) || 
           (currentPlan === 'starter' && productName.includes('başlangıç')) ||
           (currentPlan === 'pro' && productName.includes('profesyonel')) ||
           (currentPlan === 'enterprise' && productName.includes('kurumsal'));
  });
  
  // Mevcut aktif fiyatı bul - önce price ID ile, yoksa interval ile
  const currentPrice = currentProduct?.prices.find(p => p.id === activePriceId) 
    || currentProduct?.prices.find(p => p.interval === (subscriptionInfo?.interval || billingPeriod));

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-5xl mx-auto">
      {/* BAŞLIK VE ÖZET */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Organizasyon Ayarları
          </h1>
          <p className="text-muted-foreground">
            {currentOrg.name} organizasyonunu yönetin.
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
          <div className="w-10 h-10 rounded-md bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
            {currentOrg.logo_url ? (
              <img src={currentOrg.logo_url} className="w-full h-full object-cover" alt="" />
            ) : (
              currentOrg.name[0]
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">{currentOrg.name}</div>
            <div className="flex gap-2 text-xs">
              <span className="text-muted-foreground">{userRole === 'owner' ? 'Sahip' : 'Yönetici'}</span>
              <span className="text-primary font-medium">• {currentOrg.subscription_plan?.toUpperCase() || 'FREE'}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="billing">Abonelik ve Faturalar</TabsTrigger>
        </TabsList>

        {/* --- SEKME 1: GENEL BİLGİLER --- */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>Organizasyonunuzun görünen yüzünü düzenleyin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Organizasyon Adı</Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Kısayolu (Slug)</Label>
                  <div className="relative">
                    <Input 
                      value={form.slug} 
                      onChange={e => handleSlugChange(e.target.value)} 
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-2.5">
                      {checkingSlug ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : slugAvailable ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        form.slug !== originalSlug && <X className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input 
                    value={form.logo_url} 
                    onChange={e => setForm({...form, logo_url: e.target.value})} 
                    placeholder="https://..."
                  />
                  {form.logo_url && (
                    <div className="mt-2 w-12 h-12 rounded-lg border overflow-hidden">
                      <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Web Sitesi</Label>
                  <Input 
                    value={form.website} 
                    onChange={e => setForm({...form, website: e.target.value})} 
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t flex justify-end py-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Değişiklikleri Kaydet
              </Button>
            </CardFooter>
          </Card>

          {/* TEHLİKELİ BÖLGE - Sadece Owner Görür */}
          {isOwner && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-600">Tehlikeli Bölge</CardTitle>
                <CardDescription>Bu işlemler geri alınamaz.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-red-100 dark:border-red-900/30 rounded-lg bg-red-50 dark:bg-red-950/10">
                  <div>
                    <h4 className="font-medium text-red-900 dark:text-red-200">Organizasyonu Sil</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">Tüm veriler, teklifler ve üyeler kalıcı olarak silinir.</p>
                  </div>
                  <Button variant="destructive" disabled>Sil</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* --- SEKME 2: ABONELİK VE FATURALAR --- */}
        <TabsContent value="billing" className="space-y-6 mt-6">
          
          {/* ÖDEME HATASI UYARISI */}
          {(subscriptionInfo?.status === 'past_due' || currentOrg.subscription_status === 'past_due') && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-200">Ödeme Alınamadı</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Son ödemeniz başarısız oldu. Aboneliğinizin devam etmesi için lütfen ödeme yönteminizi güncelleyin.
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleOpenPortal}
                disabled={portalLoading}
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ödeme Yöntemini Güncelle"}
              </Button>
            </div>
          )}

          {/* MEVCUT PLAN KARTI */}
          <Card className="border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Mevcut Abonelik
                    <PlanBadge plan={currentOrg.subscription_plan || 'free'} />
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Abonelik durumunuz ve yenilenme bilgileri.
                  </CardDescription>
                </div>
                {/* Stripe Portal Butonu */}
                <Button 
                  variant="outline" 
                  onClick={handleOpenPortal} 
                  disabled={portalLoading || currentOrg.subscription_plan === 'free'}
                  className="hidden md:flex"
                >
                  {portalLoading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Fatura ve Ödeme Yöntemlerini Yönet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Plan
                  </span>
                  <p className="text-lg font-medium">
                    {currentProduct?.name || "Ücretsiz"}
                  </p>
                  {currentPrice && currentPrice.unit_amount && currentPrice.unit_amount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(currentPrice.unit_amount, currentPrice.currency)}/{currentPrice.interval === 'month' ? 'ay' : 'yıl'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> 
                    {(subscriptionInfo?.cancelAtPeriodEnd || currentOrg.cancel_at_period_end) 
                      ? "Bitiş Tarihi" 
                      : "Sonraki Yenileme"
                    }
                  </span>
                  {subscriptionLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Yükleniyor...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-medium">
                        {(subscriptionInfo?.currentPeriodEnd || currentOrg.current_period_end)
                          ? formatDate(subscriptionInfo?.currentPeriodEnd || currentOrg.current_period_end)
                          : (currentOrg.subscription_plan === 'free' || subscriptionInfo?.plan === 'free')
                            ? "Süresiz" 
                            : "Abonelik yok"
                        }
                      </p>
                      {(subscriptionInfo?.cancelAtPeriodEnd || currentOrg.cancel_at_period_end) ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Bu tarihte ücretsiz plana geçilecek
                        </p>
                      ) : (subscriptionInfo?.currentPeriodEnd || currentOrg.current_period_end) && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Otomatik yenilenecek
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Durum
                  </span>
                  {subscriptionLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const status = subscriptionInfo?.status || currentOrg.subscription_status;
                        const cancelAtPeriodEnd = subscriptionInfo?.cancelAtPeriodEnd || currentOrg.cancel_at_period_end;
                        const periodEnd = subscriptionInfo?.currentPeriodEnd || currentOrg.current_period_end;
                        
                        // Ödeme başarısız
                        if (status === 'past_due' || status === 'unpaid') {
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="font-medium text-red-600 dark:text-red-400">Ödeme Alınamadı</span>
                              </div>
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Ödeme yönteminizi güncelleyin
                              </p>
                            </div>
                          );
                        }
                        
                        // İptal edilecek (ama hala aktif)
                        if (cancelAtPeriodEnd && status === 'active') {
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="font-medium text-amber-600 dark:text-amber-400">İptal Edilecek</span>
                              </div>
                              {periodEnd && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  {formatDate(periodEnd)} tarihinde sona erecek
                                </p>
                              )}
                            </div>
                          );
                        }
                        
                        // İptal edildi
                        if (status === 'canceled') {
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                <span className="font-medium text-gray-600 dark:text-gray-400">İptal Edildi</span>
                              </div>
                            </div>
                          );
                        }
                        
                        // Deneme süresi
                        if (status === 'trialing') {
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="font-medium text-blue-600 dark:text-blue-400">Deneme Süresi</span>
                              </div>
                              {periodEnd && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  {formatDate(periodEnd)} tarihinde sona erecek
                                </p>
                              )}
                            </div>
                          );
                        }
                        
                        // Aktif
                        if (status === 'active') {
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="font-medium text-green-600 dark:text-green-400">Aktif</span>
                              </div>
                            </div>
                          );
                        }
                        
                        // Ücretsiz / Varsayılan
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-300" />
                              <span className="font-medium">Ücretsiz</span>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Plan Özellikleri */}
              {currentProduct?.features && currentProduct.features.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-medium mb-3">Plan Özellikleri:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentProduct.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Mobil için Portal Butonu */}
              <Button 
                variant="outline" 
                onClick={handleOpenPortal} 
                disabled={portalLoading || currentOrg.subscription_plan === 'free'}
                className="w-full mt-6 md:hidden"
              >
                Fatura ve Ödemeleri Yönet
              </Button>
            </CardContent>
          </Card>

          {/* PLAN YÜKSELTME ALANI */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Planını Değiştir</h3>
              
              {/* Billing Period Toggle */}
              <div className="inline-flex items-center p-1 rounded-full bg-muted border border-border">
                <button
                  onClick={() => setBillingPeriod("month")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    billingPeriod === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Aylık
                </button>
                <button
                  onClick={() => setBillingPeriod("year")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    billingPeriod === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Yıllık <span className="text-green-500 ml-1">-20%</span>
                </button>
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Henüz plan tanımlanmamış</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${products.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                {products.map((product) => {
                  // Seçili periyoda göre fiyatı bul
                  const price = product.prices.find(p => p.interval === billingPeriod);
                  if (!price) return null;
                  
                  // Mevcut plan kontrolü - stripe_price_id ile eşleştir
                  const isCurrentPlan = activePriceId === price.id;
                  
                  const productNameLower = product.name.toLowerCase();
                  const isPopular = productNameLower.includes('pro') || productNameLower.includes('profesyonel');
                  const amount = price.unit_amount || 0;

                  return (
                    <Card 
                      key={product.id}
                      className={`relative transition-all duration-300 ${
                        isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''
                      } ${isPopular ? 'bg-primary/5' : ''}`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground">Popüler</Badge>
                        </div>
                      )}
                      {isCurrentPlan && (
                        <div className="absolute -top-3 right-3">
                          <Badge variant="outline" className="bg-background">Mevcut</Badge>
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2 h-8">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="text-2xl font-bold">
                          {formatPrice(amount, price.currency)}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{billingPeriod === "year" ? "yıl" : "ay"}
                          </span>
                        </div>
                        {product.features.length > 0 && (
                          <ul className="mt-3 space-y-1 text-xs">
                            {product.features.slice(0, 4).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-muted-foreground">
                                <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                                <span className="line-clamp-1">{feature}</span>
                              </li>
                            ))}
                            {product.features.length > 4 && (
                              <li className="text-muted-foreground/60 text-xs">
                                +{product.features.length - 4} özellik daha
                              </li>
                            )}
                          </ul>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          variant={isPopular ? "default" : "outline"}
                          onClick={() => handleUpgrade(price.id)}
                          disabled={isCurrentPlan || checkoutLoading === price.id}
                        >
                          {checkoutLoading === price.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isCurrentPlan ? (
                            "Mevcut Plan"
                          ) : (
                            "Yükselt"
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
