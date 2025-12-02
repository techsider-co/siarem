"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization, canManageMembers } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function OrganizationSettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { currentOrg, userRole, refreshOrganizations } = useOrganization();
  
  const [loading, setLoading] = useState(false);
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

  // Mevcut org verilerini yükle
  useEffect(() => {
    if (currentOrg) {
      setForm({
        name: currentOrg.name || "",
        slug: currentOrg.slug || "",
        logo_url: currentOrg.logo_url || "",
        website: "",
      });
      setOriginalSlug(currentOrg.slug || "");
      
      // Website'i ayrıca çek (context'te olmayabilir)
      fetchOrgDetails();
    }
  }, [currentOrg?.id]);

  const fetchOrgDetails = async () => {
    if (!currentOrg) return;
    
    const { data } = await supabase
      .from("organizations")
      .select("website")
      .eq("id", currentOrg.id)
      .single();
    
    if (data) {
      setForm(prev => ({ ...prev, website: data.website || "" }));
    }
  };

  // Slug benzersizlik kontrolü (debounced)
  useEffect(() => {
    if (!form.slug || form.slug === originalSlug) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      
      const { data, error } = await supabase
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

  // Slug formatla (sadece küçük harf, sayı ve tire)
  const handleSlugChange = (value: string) => {
    const formatted = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    setForm(prev => ({ ...prev, slug: formatted }));
  };

  // Kaydet
  const handleSave = async () => {
    if (!currentOrg || !canEdit) return;
    
    // Validasyonlar
    if (!form.name.trim()) {
      toast.error("Organizasyon adı zorunludur");
      return;
    }
    
    if (!form.slug.trim()) {
      toast.error("URL kısayolu zorunludur");
      return;
    }
    
    if (form.slug !== originalSlug && slugAvailable === false) {
      toast.error("Bu URL kısayolu zaten kullanılıyor");
      return;
    }

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

    if (error) {
      toast.error("Ayarlar kaydedilemedi: " + error.message);
    } else {
      toast.success("Organizasyon ayarları güncellendi! ✨");
      setOriginalSlug(form.slug);
      await refreshOrganizations();
    }

    setLoading(false);
  };

  // Erişim kontrolü
  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Organizasyon seçilmedi</p>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-400" />
          <p className="text-lg font-medium text-foreground mb-2">Erişim Reddedildi</p>
          <p>Bu sayfayı görüntülemek için yönetici veya sahip yetkisi gereklidir.</p>
        </div>
      </div>
    );
  }

  // Plan badge'i
  const PlanBadge = () => {
    const plans: Record<string, { label: string; className: string }> = {
      free: { label: "Ücretsiz", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
      starter: { label: "Başlangıç", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      pro: { label: "Profesyonel", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
      enterprise: { label: "Kurumsal", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    };
    
    const plan = plans[currentOrg.subscription_plan] || plans.free;
    
    return (
      <Badge className={plan.className}>
        {plan.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 p-8 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Organizasyon Ayarları
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentOrg.name} organizasyonunun temel ayarlarını yönetin.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || (form.slug !== originalSlug && slugAvailable === false)}
          className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/25"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Değişiklikleri Kaydet
            </>
          )}
        </Button>
      </div>

      {/* ROL BADGE */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-md">
          {currentOrg.logo_url ? (
            <img
              src={currentOrg.logo_url}
              alt={currentOrg.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            currentOrg.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-foreground">{currentOrg.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <PlanBadge />
            <Badge 
              variant="outline" 
              className={userRole === "owner" 
                ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700" 
                : "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700"
              }
            >
              {userRole === "owner" ? (
                <>
                  <Crown className="w-3 h-3 mr-1" /> Sahip
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 mr-1" /> Yönetici
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-2xl shadow-md space-y-8">
        {/* Temel Bilgiler */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Building2 className="text-primary" />
            Temel Bilgiler
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organizasyon Adı */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Organizasyon Adı <span className="text-red-500">*</span>
              </Label>
              <Input
                className="bg-white dark:bg-slate-950 border-border text-foreground"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn: Unalisi Technologies"
              />
            </div>

            {/* URL Kısayolu (Slug) */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                URL Kısayolu <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground pr-10"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="unalisi-tech"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingSlug && (
                    <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {!checkingSlug && slugAvailable === true && form.slug !== originalSlug && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {!checkingSlug && slugAvailable === false && form.slug !== originalSlug && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sadece küçük harf, rakam ve tire kullanılabilir.
              </p>
              {slugAvailable === false && form.slug !== originalSlug && (
                <p className="text-xs text-red-500">
                  Bu URL kısayolu zaten kullanılıyor.
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Marka & İletişim */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Globe className="text-secondary" />
            Marka & İletişim
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo URL */}
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Image className="w-4 h-4" />
                Logo URL
              </Label>
              <Input
                className="bg-white dark:bg-slate-950 border-border text-foreground"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Logo görüntüsü için URL girin (önerilen: 256x256px)
              </p>
              
              {/* Logo Önizleme */}
              {form.logo_url && (
                <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Önizleme:</p>
                  <div className="w-16 h-16 rounded-lg bg-white dark:bg-slate-900 border border-border flex items-center justify-center overflow-hidden">
                    <img
                      src={form.logo_url}
                      alt="Logo önizleme"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Web Sitesi
              </Label>
              <Input
                className="bg-white dark:bg-slate-950 border-border text-foreground"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://unalisi.dev"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Abonelik Bilgisi (Salt Okunur) */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            💎 Abonelik
          </h3>
          
          <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mevcut Plan</p>
                <p className="text-xl font-bold text-foreground mt-1 flex items-center gap-2">
                  <PlanBadge />
                </p>
              </div>
              <Button variant="outline" disabled>
                Planı Yükselt (Yakında)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Abonelik yönetimi yakında aktif olacaktır.
            </p>
          </div>
        </div>
      </div>

      {/* DANGER ZONE */}
      {userRole === "owner" && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Tehlikeli Bölge
          </h3>
          <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-4">
            Bu işlemler geri alınamaz. Dikkatli olun.
          </p>
          <Button 
            variant="outline" 
            className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
            disabled
          >
            Organizasyonu Sil (Yakında)
          </Button>
        </div>
      )}
    </div>
  );
}

