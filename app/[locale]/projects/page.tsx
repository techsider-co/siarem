"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Rocket,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Tip Tanımı (Hafif Güncellendi)
interface Project {
  id: string;
  name: string;
  progress: number;
  deadline: string;
  customers: { company_name: string };
}

export default function ProjectsPage() {
  const supabase = createClient();
  const router = useRouter();
  const t = useTranslations("Projects");

  const [projects, setProjects] = useState<Project[]>([]); // Tip düzeltildi
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      // Projeleri ve Müşteri isimlerini çek
      const { data, error } = await supabase
        .from("projects")
        .select(`*, customers (company_name)`)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Projeler yüklenemedi.");
      } else {
        setProjects((data as any) || []);
      }
      setLoading(false);
    };
    fetchProjects();
  }, []);

  // --- PROJE SİLME FONKSİYONU ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Kartın tıklanmasını engelle (Sayfaya gitmesin)

    if (
      !confirm(
        "⚠️ DİKKAT: Bu projeyi ve içindeki TÜM GÖREVLERİ kalıcı olarak silmek istediğinize emin misiniz?"
      )
    )
      return;

    // DB'de Cascade ayarlı olduğu için projeyi silince görevler de silinir
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success("Proje ve görevleri silindi. 🗑️");
      setProjects(projects.filter((p) => p.id !== id)); // Listeden düşür
    }
  };

  // --- KARTA TIKLAMA ---
  const handleCardClick = (id: string) => {
    // Navigation.ts'den gelen router otomatik olarak dil bazlı URL'e çevirir
    // /projects/[id] route'u navigation.ts'de tanımlı, otomatik olarak
    // /tr/projeler/${id} veya /en/projects/${id} gibi URL'lere çevrilecek
    router.push(`/projects/${id}` as any);
  };

  // Tarih Formatla
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("tr-TR");

  // Gün Hesapla
  const getDaysLeft = (deadline: string) => {
    const today = new Date();
    const target = new Date(deadline);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderDeadlineBadge = (deadline: string) => {
    const days = getDaysLeft(deadline);
    if (days < 0)
      return (
        <span className="flex items-center gap-1 text-red-500 font-bold">
          <AlertCircle className="w-3 h-3" /> {Math.abs(days)} Gün Gecikti
        </span>
      );
    if (days === 0)
      return (
        <span className="flex items-center gap-1 text-orange-500 font-bold">
          <Clock className="w-3 h-3" /> Bugün Son!
        </span>
      );
    if (days <= 3)
      return (
        <span className="flex items-center gap-1 text-orange-400 font-bold">
          <Clock className="w-3 h-3" /> {days} Gün Kaldı
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-blue-400">
        <Clock className="w-3 h-3" /> {days} Gün Kaldı
      </span>
    );
  };

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white glow-text flex items-center gap-3">
            <Rocket className="h-8 w-8 text-orange-500" /> {t("title")}
          </h1>
          <p className="text-slate-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        {/* Yeni Proje Butonu (Manuel ekleme gerekirse buraya modal bağlanabilir, şimdilik oto oluşuyor) */}
        {/* <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="mr-2 h-4 w-4"/> Yeni Proje</Button> */}
      </div>

      {/* PROJE KARTLARI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-slate-500 col-span-full text-center py-20">
            Yükleniyor...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-slate-500 col-span-full text-center py-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            Henüz aktif proje yok. Teklifleri onaylayarak proje
            başlatabilirsiniz.
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleCardClick(project.id)}
              className="group glass-panel p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all hover:transform hover:-translate-y-1 relative overflow-hidden cursor-pointer"
            >
              {/* Neon Glow Efekti (Hover) */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* SİLME BUTONU (SAĞ ÜST - HOVER İLE GÖRÜNÜR) */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-lg bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30"
                  onClick={(e) => handleDelete(e, project.id)}
                  title="Projeyi Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-between items-start mb-4 pr-8">
                {" "}
                {/* pr-8: Sil butonu için boşluk */}
                <div>
                  <h3
                    className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1"
                    title={project.name}
                  >
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-1">
                    {project.customers?.company_name}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-blue-900/20 text-blue-400 border-blue-800 shrink-0"
                >
                  Active
                </Badge>
              </div>

              {/* İlerleme Çubuğu */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>İlerleme</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{" "}
                  {formatDate(project.deadline)}
                </div>
                {renderDeadlineBadge(project.deadline)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
