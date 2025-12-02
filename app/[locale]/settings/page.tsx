"use client";

import { useEffect, useState} from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter()
  const [loading, setLoading] = useState(false);

  // Profil Verisi State'i
  const [profile, setProfile] = useState({
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
  });

  // Verileri Çek
  useEffect(() => {
    const fetchProfile = async () => {
      // Mevcut kullanıcıyı al (Şu an anonim olabilir ama ileride auth ekleyince çalışır)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Geçici olarak: Eğer user yoksa bile ilk kaydı çekelim veya boş bırakalım.
      // Auth eklenmediği için şimdilik tablodaki ilk satırı çekmeyi deneyelim veya mock yapalım.
      // GERÇEK SENARYODA: .eq('id', user.id) kullanılır.

      const { data, error } = await supabase
        .from("profiles")
        .select("*").eq('is_archived', false)
        .single();

      if (data) {
        setProfile(data);
      } else if (!error) {
        // Hiç kayıt yoksa varsayılanları koy
        // (Burada ilk kaydı oluşturmak için bir tetikleyici gerekebilir ama şimdilik manuel doldurtalım)
      }
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

  return (
    <div className="space-y-8 p-8 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white glow-text flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-500 animate-spin-slow" />{" "}
            Sistem Ayarları
          </h1>
          <p className="text-slate-400 mt-1">
            Global yapılandırma ve profil yönetimi.
          </p>
        </div>
        <Button
          onClick={handleUpdate}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] border-0 h-10 px-6 rounded-xl"
        >
          {loading ? (
            "Kaydediliyor..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Değişiklikleri Kaydet
            </>
          )}
        </Button>
      </div>

      {/* TABS (SEKMELER) */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <User className="w-4 h-4 mr-2" /> Profil & Kimlik
          </TabsTrigger>
          <TabsTrigger
            value="company"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <Building className="w-4 h-4 mr-2" /> Şirket & Marka
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all"
          >
            <ShieldCheck className="w-4 h-4 mr-2" /> Sistem & Tercihler
          </TabsTrigger>
        </TabsList>

        {/* 1. SEKME: PROFİL */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="glass-panel p-8 rounded-2xl neon-border">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                Üİ
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Kişisel Bilgiler
                </h3>
                <p className="text-slate-400 text-sm">
                  Tekliflerin altında görünecek imza bilgileri.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Ad Soyad</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Örn: Ünal İsi"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Unvan</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.title}
                  onChange={(e) =>
                    setProfile({ ...profile, title: e.target.value })
                  }
                  placeholder="Örn: Full Stack Developer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">E-Posta</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="sales@unalisi.dev"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Telefon</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
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
          <div className="glass-panel p-8 rounded-2xl neon-border">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Building className="text-purple-500" /> Marka Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Şirket / Marka Adı</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.company_name}
                  onChange={(e) =>
                    setProfile({ ...profile, company_name: e.target.value })
                  }
                  placeholder="Örn: unalisi.dev"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Web Sitesi</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.website}
                  onChange={(e) =>
                    setProfile({ ...profile, website: e.target.value })
                  }
                  placeholder="https://unalisi.dev"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-slate-300">Adres</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.address}
                  onChange={(e) =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                  placeholder="Ofis adresi..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Şehir</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
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
          <div className="glass-panel p-8 rounded-2xl neon-border">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <CreditCard className="text-green-500" /> Varsayılanlar
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Teklif Geçerlilik Süresi (Gün)
                </Label>
                <Input
                  type="number"
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.default_valid_days}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      default_valid_days: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-slate-500">
                  Teklif oluşturulduğunda otomatik eklenecek süre.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Para Birimi</Label>
                <Input
                  className="bg-slate-950 border-slate-700 text-white"
                  value={profile.default_currency}
                  disabled
                />
                <p className="text-xs text-slate-500">
                  Şu an sadece TRY desteklenmektedir.
                </p>
              </div>
            </div>

            <Separator className="my-8 bg-slate-800" />

           <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-red-400 font-semibold">Oturumu Kapat</h4>
                    <p className="text-slate-500 text-sm">Sistemden güvenli çıkış yap.</p>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={handleLogout} // <--- BURASI
                  className="bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-200 border border-red-900/50"
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
