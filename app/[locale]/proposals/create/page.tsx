"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Customer } from "@/types";
import { toast } from "sonner";
import { analyzeWebsite } from "../ai-actions"; // <--- AI Server Action
import {
  Save,
  ArrowLeft,
  Rocket,
  Lock,
  Layers,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Upload,
  X,
  Cpu,
  Sparkles,
  Globe,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// --- TİPLER ---
interface ServiceItem {
  title: string;
  description: string;
  price: number;
}
interface TimelineItem {
  phase: string;
  title: string;
  description: string;
}
interface TechStackItem {
  title: string;
  description: string;
}
interface AnalysisItem {
  title: string;
  description: string;
}

interface AnalysisData {
  problems: AnalysisItem[];
  solutions: AnalysisItem[];
  scores: { mobile: number; access: number; seo: number; target: number };
}

export default function CreateProposalPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE'LER ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [proposalNo, setProposalNo] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // AI State
  const [targetUrl, setTargetUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [services, setServices] = useState<ServiceItem[]>([
    {
      title: "Web Geliştirme & UI/UX Tasarım",
      description: "Figma prototipleme ve modern arayüz tasarımı.",
      price: 8000,
    },
    {
      title: "Next.js Altyapı & Kodlama",
      description: "%100 Responsive, SEO uyumlu frontend mimarisi.",
      price: 10000,
    },
  ]);
  const [discount, setDiscount] = useState(0);

  const [analysis, setAnalysis] = useState<AnalysisData>({
    problems: [
      {
        title: "Mobil Deneyim Eksikliği",
        description:
          "Müşterilerin %80'i telefonla sitenize giriyor ancak menüler mobilde zor yönetiliyor.",
      },
      {
        title: "Görsel Yüklenme Hızı",
        description:
          "Yüksek çözünürlüklü görseller optimize edilmediği için site geç açılıyor.",
      },
      {
        title: "Eski Teknoloji",
        description: "Mevcut altyapı güncel SEO standartlarını karşılamıyor.",
      },
    ],
    solutions: [
      {
        title: "Next.js & Image Engine",
        description:
          "Google'ın yeni nesil formatlarıyla görselleriniz milisaniyeler içinde açılacak.",
      },
      {
        title: "Premium Galeri Deneyimi",
        description:
          "Karmaşadan uzak, projelerinizi ön plana çıkaran minimalist arayüz.",
      },
      {
        title: "Mobile First Yaklaşım",
        description: "Tüm cihazlarda uygulama kalitesinde pürüzsüz deneyim.",
      },
    ],
    scores: { mobile: 73, access: 66, seo: 83, target: 98 },
  });

  const [techStack, setTechStack] = useState<TechStackItem[]>([
    {
      title: "UI/UX & Prototipleme",
      description:
        "Figma üzerinde tasarlanan, marka kimliğinizi yansıtan modern arayüz.",
    },
    {
      title: "Next.js Mimari",
      description: "Google destekli yüksek performanslı ve güvenli altyapı.",
    },
    {
      title: "Multi-Device Uyum",
      description: "Tüm cihazlarda kusursuz çalışan Responsive kod yapısı.",
    },
    {
      title: "SEO & Hız",
      description:
        "Google Core Vitals kriterlerine uygun teknik SEO altyapısı.",
    },
  ]);

  const [timeline, setTimeline] = useState<TimelineItem[]>([
    {
      phase: "SPRINT 1 / GÜN 1-2",
      title: "Kurulum & Marka Entegrasyonu",
      description: "Domain, Hosting ve Next.js kurulumu.",
    },
    {
      phase: "SPRINT 2 / GÜN 3-5",
      title: "Kodlama, İçerik & SEO",
      description: "Sayfaların kodlanması ve içerik girişi.",
    },
    {
      phase: "SPRINT 3 / GÜN 6-7",
      title: "Test & Canlıya Geçiş 🚀",
      description: "Hız testleri, SSL ve yayınlama.",
    },
  ]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from("customers").select("*");
      if (data) setCustomers(data);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 15);
      setValidUntil(targetDate.toISOString().split("T")[0]);
    };
    init();
  }, []);

// --- AI ANALİZ FONKSİYONU (GÜNCELLENDİ) ---
  const handleAIAnalyze = async () => {
    if (!targetUrl) { toast.warning("Lütfen analiz edilecek bir URL girin."); return; }
    
    setIsAnalyzing(true);
    toast.info("Site Taranıyor & PageSpeed Ölçülüyor... (10-20sn)");

    try {
        const result = await analyzeWebsite(targetUrl);

        if (result.error) {
            toast.error(result.error);
        } else if (result.data) {
            const d = result.data;
            
            // 1. Analiz Verilerini Doldur
            if(d.analysis) setAnalysis(d.analysis);
            
            // 2. Teknoloji Yığınını Doldur
            if(d.techStack) setTechStack(d.techStack);
            
            // 3. Zaman Çizelgesini Doldur
            if(d.timeline) setTimeline(d.timeline);
            
            // 4. Hizmetleri ve Fiyatı Doldur
            if(d.services) setServices(d.services);

            toast.success("Tüm rapor başarıyla oluşturuldu! 🤖✨");
        }
    } catch (e) {
        toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // ... (Diğer yardımcı fonksiyonlar aynı: generateProposalNo, handleCustomerSelect vs.)
  const generateProposalNo = async (customer: Customer) => {
    const date = new Date();
    const prefix = `${date.getFullYear()}${
      customer.sector_code || "GEN"
    }${String(date.getMonth() + 1).padStart(2, "0")}`;
    const { count } = await supabase
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .ilike("proposal_no", `${prefix}-%`);
    return `${prefix}-${(count || 0) + 101}`;
  };

  const handleCustomerSelect = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setProposalNo(await generateProposalNo(customer));
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      !event.target.files ||
      event.target.files.length === 0 ||
      !selectedCustomer
    ) {
      if (!selectedCustomer) toast.error("Önce bir müşteri seçmelisiniz.");
      return;
    }
    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${selectedCustomer.id}_${Date.now()}.${fileExt}`;
    setUploadingLogo(true);
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file);
    if (uploadError) {
      toast.error("Logo yüklenemedi.");
      setUploadingLogo(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(fileName);
    await supabase
      .from("customers")
      .update({ logo_url: publicUrl })
      .eq("id", selectedCustomer.id);
    setSelectedCustomer({ ...selectedCustomer, logo_url: publicUrl });
    setCustomers(
      customers.map((c) =>
        c.id === selectedCustomer.id ? { ...c, logo_url: publicUrl } : c
      )
    );
    toast.success("Logo yüklendi!");
    setUploadingLogo(false);
  };

  const removeLogo = async () => {
    if (!selectedCustomer) return;
    await supabase
      .from("customers")
      .update({ logo_url: null })
      .eq("id", selectedCustomer.id);
    setSelectedCustomer({ ...selectedCustomer, logo_url: null });
    toast.info("Logo kaldırıldı.");
  };

  // Helper Functions
  const addService = () =>
    setServices([...services, { title: "", description: "", price: 0 }]);
  const removeService = (i: number) =>
    setServices(services.filter((_, idx) => idx !== i));
  const updateService = (i: number, f: keyof ServiceItem, v: any) => {
    const n = [...services];
    (n[i] as any)[f] = v;
    setServices(n);
  };
  const addTimeline = () =>
    setTimeline([...timeline, { phase: "", title: "", description: "" }]);
  const removeTimeline = (i: number) =>
    setTimeline(timeline.filter((_, idx) => idx !== i));
  const updateTimeline = (i: number, f: keyof TimelineItem, v: any) => {
    const n = [...timeline];
    (n[i] as any)[f] = v;
    setTimeline(n);
  };
  const addTech = () =>
    setTechStack([...techStack, { title: "", description: "" }]);
  const removeTech = (i: number) =>
    setTechStack(techStack.filter((_, idx) => idx !== i));
  const updateTech = (i: number, f: keyof TechStackItem, v: any) => {
    const n = [...techStack];
    (n[i] as any)[f] = v;
    setTechStack(n);
  };

  // Analiz Helper
  const handleAnalysisChange = (
    type: "problems" | "solutions",
    i: number,
    f: "title" | "description",
    v: string
  ) => {
    const newArr = [...analysis[type]];
    // @ts-ignore
    newArr[i][f] = v;
    setAnalysis({ ...analysis, [type]: newArr });
  };
  const addAnalysisItem = (type: "problems" | "solutions") =>
    setAnalysis({
      ...analysis,
      [type]: [...analysis[type], { title: "", description: "" }],
    });
  const removeAnalysisItem = (type: "problems" | "solutions", index: number) =>
    setAnalysis({
      ...analysis,
      [type]: analysis[type].filter((_, i) => i !== index),
    });

  const subTotal = services.reduce((sum, item) => sum + Number(item.price), 0);
  const grandTotal = subTotal - discount;
  const generateSecretKey = () =>
    `prop_${Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error("Müşteri seçin.");
      return;
    }
    const contentPayload = { services, timeline, analysis, techStack };
    const { error } = await supabase.from("proposals").insert([
      {
        customer_id: selectedCustomer.id,
        proposal_no: proposalNo,
        valid_until: validUntil,
        status: "draft",
        total_amount: grandTotal,
        discount_amount: discount,
        content: contentPayload,
        access_key: generateSecretKey(),
      },
    ]);
    if (error) toast.error("Hata: " + error.message);
    else {
      toast.success("Teklif oluşturuldu! 🚀");
      router.push("/proposals");
    }
  };

  return (
    <div className="space-y-6 p-8 pb-20">
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800 sticky top-4 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white glow-text">
              Teklif Sihirbazı v2.4 (AI)
            </h1>
            <p className="text-xs text-slate-400">
              Yapay zeka destekli içerik üretimi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs text-slate-500 uppercase tracking-widest">
              Toplam Tutar
            </div>
            <div className="text-xl font-bold text-green-400">
              {grandTotal.toLocaleString()} ₺
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
          >
            <Save className="mr-2 h-4 w-4" /> Kaydet
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl grid grid-cols-5 h-auto">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 rounded-lg"
          >
            <Rocket className="w-4 h-4 mr-2" /> Genel
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 rounded-lg"
          >
            <AlertTriangle className="w-4 h-4 mr-2" /> Analiz
          </TabsTrigger>
          <TabsTrigger
            value="tech"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 rounded-lg"
          >
            <Cpu className="w-4 h-4 mr-2" /> Teknoloji
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 rounded-lg"
          >
            <Calendar className="w-4 h-4 mr-2" /> Zaman
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-3 rounded-lg"
          >
            <CreditCard className="w-4 h-4 mr-2" /> Hizmet
          </TabsTrigger>
        </TabsList>

        {/* 1. GENEL */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Müşteri ve Marka</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Müşteri</Label>
                <Select onValueChange={handleCustomerSelect}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seçiniz..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Kurum Logosu</Label>
                {selectedCustomer ? (
                  <div className="flex items-center gap-4">
                    {selectedCustomer.logo_url ? (
                      <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-lg border border-slate-700">
                        <img
                          src={selectedCustomer.logo_url}
                          alt="Logo"
                          className="h-10 w-auto object-contain bg-white rounded-md p-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeLogo}
                          className="text-red-400 hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                        />
                        <Button
                          variant="outline"
                          disabled={uploadingLogo}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-blue-500 hover:bg-blue-900/10"
                        >
                          {uploadingLogo ? (
                            "Yükleniyor..."
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" /> Logo Yükle
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic p-2">
                    Önce müşteri seçiniz.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Geçerlilik Tarihi</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={validUntil}
                    readOnly
                    className="bg-slate-950 border-slate-800 text-slate-400 cursor-not-allowed"
                  />
                  <Lock className="absolute right-10 top-2.5 w-4 h-4 text-slate-600" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Teklif No</Label>
                <div className="relative">
                  <Input
                    value={proposalNo}
                    readOnly
                    className="bg-slate-950 border-slate-800 text-slate-400 pl-10 cursor-not-allowed"
                  />
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ANALİZ (AI ENTEGRASYONU BURADA) */}
        <TabsContent value="analysis" className="space-y-6">
          {/* --- AI KUTUSU --- */}
          <div className="bg-slate-900/50 p-5 rounded-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label className="text-purple-400 font-bold flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" /> AI Otomatik Analiz
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="https://mimarindesign.com (Mevcut site varsa giriniz)"
                    className="bg-slate-950 border-slate-700 text-white pl-10"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Mevcut siteyi tarar, eksikleri bulur ve kutuları otomatik
                  doldurur.
                </p>
              </div>
              <Button
                onClick={handleAIAnalyze}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiz
                    Ediliyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" /> AI ile Doldur
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-950 border-red-900/30">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Sorunlar (Kırmızı)
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addAnalysisItem("problems")}
                  className="text-slate-400 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.problems.map((prob, i) => (
                  <div
                    key={i}
                    className="group relative grid gap-2 p-3 border border-red-900/20 rounded bg-red-950/10"
                  >
                    <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => removeAnalysisItem("problems", i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Label className="text-xs text-red-300/70 uppercase">
                      Başlık
                    </Label>
                    <Input
                      value={prob.title}
                      onChange={(e) =>
                        handleAnalysisChange(
                          "problems",
                          i,
                          "title",
                          e.target.value
                        )
                      }
                      className="bg-slate-900 border-slate-800 text-white h-8"
                    />
                    <Label className="text-xs text-red-300/70 uppercase">
                      Açıklama
                    </Label>
                    <Textarea
                      value={prob.description}
                      onChange={(e) =>
                        handleAnalysisChange(
                          "problems",
                          i,
                          "description",
                          e.target.value
                        )
                      }
                      className="bg-slate-900 border-slate-800 text-slate-300 h-16 resize-none"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-slate-950 border-green-900/30">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Çözümler (Yeşil)
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addAnalysisItem("solutions")}
                  className="text-slate-400 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.solutions.map((sol, i) => (
                  <div
                    key={i}
                    className="group relative grid gap-2 p-3 border border-green-900/20 rounded bg-green-950/10"
                  >
                    <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => removeAnalysisItem("solutions", i)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Label className="text-xs text-green-300/70 uppercase">
                      Başlık
                    </Label>
                    <Input
                      value={sol.title}
                      onChange={(e) =>
                        handleAnalysisChange(
                          "solutions",
                          i,
                          "title",
                          e.target.value
                        )
                      }
                      className="bg-slate-900 border-slate-800 text-white h-8"
                    />
                    <Label className="text-xs text-green-300/70 uppercase">
                      Açıklama
                    </Label>
                    <Textarea
                      value={sol.description}
                      onChange={(e) =>
                        handleAnalysisChange(
                          "solutions",
                          i,
                          "description",
                          e.target.value
                        )
                      }
                      className="bg-slate-900 border-slate-800 text-slate-300 h-16 resize-none"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Performans Skorları</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Mobil</Label>
                <Input
                  type="number"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={analysis.scores.mobile}
                  onChange={(e) =>
                    setAnalysis({
                      ...analysis,
                      scores: {
                        ...analysis.scores,
                        mobile: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">Erişim</Label>
                <Input
                  type="number"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={analysis.scores.access}
                  onChange={(e) =>
                    setAnalysis({
                      ...analysis,
                      scores: {
                        ...analysis.scores,
                        access: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400">SEO</Label>
                <Input
                  type="number"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={analysis.scores.seo}
                  onChange={(e) =>
                    setAnalysis({
                      ...analysis,
                      scores: {
                        ...analysis.scores,
                        seo: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-green-400">HEDEF</Label>
                <Input
                  type="number"
                  className="bg-slate-900 border-green-700/50 text-green-400 font-bold"
                  value={analysis.scores.target}
                  onChange={(e) =>
                    setAnalysis({
                      ...analysis,
                      scores: {
                        ...analysis.scores,
                        target: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. TEKNOLOJİ */}
        <TabsContent value="tech" className="space-y-6">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" /> Teknoloji Yığını
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={addTech}
                className="border-slate-700 hover:bg-slate-800 text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Ekle
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {techStack.map((item, i) => (
                <div
                  key={i}
                  className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-slate-800 rounded-lg bg-slate-900/30"
                >
                  <div className="md:col-span-4">
                    <Label className="text-xs text-blue-400 uppercase">
                      Teknoloji
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.title}
                      onChange={(e) => updateTech(i, "title", e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-8">
                    <Label className="text-xs text-slate-400 uppercase">
                      Açıklama
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.description}
                      onChange={(e) =>
                        updateTech(i, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="absolute -right-3 -top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => removeTech(i)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ZAMAN */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-white">Proje Takvimi</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={addTimeline}
                className="border-slate-700 hover:bg-slate-800 text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Ekle
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-slate-800 rounded-lg bg-slate-900/30"
                >
                  <div className="md:col-span-3">
                    <Label className="text-xs text-blue-400 uppercase">
                      Faz / Tarih
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.phase}
                      onChange={(e) =>
                        updateTimeline(i, "phase", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs text-slate-400 uppercase">
                      Başlık
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.title}
                      onChange={(e) =>
                        updateTimeline(i, "title", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-5">
                    <Label className="text-xs text-slate-400 uppercase">
                      Açıklama
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.description}
                      onChange={(e) =>
                        updateTimeline(i, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeline(i)}
                      className="text-red-500 hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. HİZMETLER */}
        <TabsContent value="services" className="space-y-6">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-white">Hizmet Kalemleri</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={addService}
                className="border-slate-700 hover:bg-slate-800 text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Ekle
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border border-slate-800 rounded-lg bg-slate-900/30 relative group"
                >
                  <div className="md:col-span-4">
                    <Label className="text-xs text-slate-400 uppercase">
                      Başlık
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.title}
                      onChange={(e) =>
                        updateService(i, "title", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Label className="text-xs text-slate-400 uppercase">
                      Açıklama
                    </Label>
                    <Input
                      className="bg-slate-950 border-slate-700 text-white mt-1"
                      value={item.description}
                      onChange={(e) =>
                        updateService(i, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-green-400 uppercase">
                      Fiyat (₺)
                    </Label>
                    <Input
                      type="number"
                      className="bg-slate-950 border-slate-700 text-white mt-1 text-right font-mono"
                      value={item.price}
                      onChange={(e) =>
                        updateService(i, "price", Number(e.target.value))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(i)}
                    className="absolute -top-3 -right-3 bg-red-900 text-white rounded-full w-6 h-6 hover:bg-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Separator className="bg-slate-800 my-4" />
              <div className="flex justify-end items-center gap-4">
                <div className="text-right">
                  <Label className="text-slate-400">İndirim Tutarı</Label>
                  <Input
                    type="number"
                    className="bg-slate-900 border-slate-700 text-white w-32 text-right mt-1"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 uppercase">
                    Toplam Tutar
                  </div>
                  <div className="text-3xl font-bold text-white glow-text">
                    {grandTotal.toLocaleString()} ₺
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
