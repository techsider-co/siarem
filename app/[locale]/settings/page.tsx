"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Settings,
  User,
  Building,
  Save,
  ShieldCheck,
  CreditCard,
  LogOut,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Profil Verisi State'i - varsayılan değerler
  const defaultProfile = {
    full_name: "",
    title: "",
    email: "",
    phone: "",
    company_name: "",
    website: "",
    address: "",
    city: "",
    default_valid_days: 15,
    default_currency: "TRY",
  };

  const [profile, setProfile] = useState(defaultProfile);

  // Verileri Çek
  useEffect(() => {
    const fetchProfile = async () => {
      setPageLoading(true);
      
      try {
        // Mevcut kullanıcıyı al
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          console.log("[Settings] No user found");
          setPageLoading(false);
          return;
        }

        console.log("[Settings] Fetching profile for user:", user.id);

        // Kullanıcının profilini çek
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("[Settings] Profile fetch error:", error);
          // Profil bulunamadıysa e-postayı auth'dan al
          setProfile({
            ...defaultProfile,
            email: user.email || "",
          });
        } else if (data) {
          console.log("[Settings] Profile loaded:", data);
          // Mevcut profil verilerini state'e yükle
          // Null değerleri varsayılanlarla değiştir
          setProfile({
            full_name: data.full_name || "",
            title: data.title || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            company_name: data.company_name || "",
            website: data.website || "",
            address: data.address || "",
            city: data.city || "",
            default_valid_days: data.default_valid_days || 15,
            default_currency: data.default_currency || "TRY",
          });
        }
      } catch (err) {
        console.error("[Settings] Error:", err);
        toast.error("Profil bilgileri yüklenemedi");
      }

      setPageLoading(false);
    };

    fetchProfile();
  }, []);

  // Güncelleme İşlemi
  const handleUpdate = async () => {
    setLoading(true);

    // 1. Aktif Kullanıcıyı Al
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
      setLoading(false);
      return;
    }

    // 2. Kullanıcı ID'si ile Upsert (Varsa güncelle, yoksa ekle)
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, // ARTIK ID NULL DEĞİL!
      ...profile,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Ayarlar kaydedilemedi: " + error.message);
    } else {
      toast.success("Sistem ayarları güncellendi! 💾");
    }
    setLoading(false);
  };

  // 2. ÇIKIŞ YAP FONKSİYONU (Bunu ekle)
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error("Çıkış yapılamadı: " + error.message);
    } else {
      toast.success("Oturum kapatıldı. Güvenli uçuşlar! 👋");
      router.push("/login"); // Login sayfasına at
      router.refresh(); // Cache'i temizle
    }
  };

  // Sayfa yüklenirken loading göster
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Profil bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary animate-spin-slow" />{" "}
            Sistem Ayarları
          </h1>
          <p className="text-muted-foreground mt-1">
            Global yapılandırma ve profil yönetimi.
          </p>
        </div>
        <Button
          onClick={handleUpdate}
          disabled={loading || pageLoading}
          className="bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/25 border-0 h-10 px-6 rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Değişiklikleri Kaydet
            </>
          )}
        </Button>
      </div>

      {/* TABS (SEKMELER) */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 dark:bg-slate-900/50 p-1 rounded-xl border border-border">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
          >
            <User className="w-4 h-4 mr-2" /> Profil & Kimlik
          </TabsTrigger>
          <TabsTrigger
            value="company"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
          >
            <Building className="w-4 h-4 mr-2" /> Şirket & Marka
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
          >
            <ShieldCheck className="w-4 h-4 mr-2" /> Sistem & Tercihler
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: PROFİL */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-2xl shadow-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {profile.full_name
                  ? profile.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "?"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Kişisel Bilgiler
                </h3>
                <p className="text-muted-foreground text-sm">
                  Tekliflerin altında görünecek imza bilgileri.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Ad Soyad</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Örn: Ünal İsi"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Unvan</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.title}
                  onChange={(e) =>
                    setProfile({ ...profile, title: e.target.value })
                  }
                  placeholder="Örn: Full Stack Developer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">E-Posta</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="sales@unalisi.dev"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Telefon</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  placeholder="+90 5..."
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. SEKME: ŞİRKET */}
        <TabsContent value="company" className="mt-6 space-y-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Building className="text-secondary" /> Marka Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Şirket / Marka Adı</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.company_name}
                  onChange={(e) =>
                    setProfile({ ...profile, company_name: e.target.value })
                  }
                  placeholder="Örn: unalisi.dev"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Web Sitesi</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.website}
                  onChange={(e) =>
                    setProfile({ ...profile, website: e.target.value })
                  }
                  placeholder="https://unalisi.dev"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-muted-foreground">Adres</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.address}
                  onChange={(e) =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                  placeholder="Ofis adresi..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Şehir</Label>
                <Input
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.city}
                  onChange={(e) =>
                    setProfile({ ...profile, city: e.target.value })
                  }
                  placeholder="Eskişehir"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. SEKME: SİSTEM */}
        <TabsContent value="system" className="mt-6 space-y-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border p-8 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <CreditCard className="text-green-500" /> Varsayılanlar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Teklif Geçerlilik Süresi (Gün)
                </Label>
                <Input
                  type="number"
                  className="bg-white dark:bg-slate-950 border-border text-foreground"
                  value={profile.default_valid_days}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      default_valid_days: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Teklif oluşturulduğunda otomatik eklenecek süre.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Para Birimi</Label>
                <Input
                  className="bg-muted/30 dark:bg-slate-950 border-border text-muted-foreground"
                  value={profile.default_currency}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Şu an sadece TRY desteklenmektedir.
                </p>
              </div>
            </div>

            <Separator className="my-8 bg-border" />

           <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-red-600 dark:text-red-400 font-semibold">Oturumu Kapat</h4>
                    <p className="text-muted-foreground text-sm">Sistemden güvenli çıkış yap.</p>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={handleLogout}
                  className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-200 border border-red-200 dark:border-red-900/50"
                >
                    <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
                </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
