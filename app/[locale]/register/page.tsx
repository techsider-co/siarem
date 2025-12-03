"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Rocket, Lock, Mail, User, Loader2, ArrowRight, Sparkles, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { register } from "./actions";
import { Link } from "@/navigation";

export default function RegisterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);

  // URL'den davet bilgilerini al (varsa)
  const inviteEmail = searchParams.get("email");
  const inviteToken = searchParams.get("invite");
  
  // 🆕 Plan parametresini al (pricing'den geliyorsa)
  const planId = searchParams.get("plan");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    // Şifre kontrolü
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor!");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      setLoading(false);
      return;
    }

    // 🆕 Plan ID'yi formData'ya ekle
    if (planId) {
      formData.set("planId", planId);
    }

    const result = await register(formData, locale);

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    }
  };

  // Login linkini plan parametresiyle oluştur
  const loginHref = planId 
    ? { pathname: "/login" as const, query: { plan: planId } } 
    : "/login" as const;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-900 dark:via-[#020617] dark:to-[#020617]">
      {/* Arka Plan Efektleri */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-400/20 dark:bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-400/20 dark:bg-teal-600/20 rounded-full blur-[120px] animate-pulse"></div>

      {/* Dekoratif Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] -z-10 opacity-50"></div>

      {/* Register Kartı */}
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl relative group">
        {/* Neon Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl opacity-10 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-500 blur"></div>

        <div className="relative">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Hesap Oluştur</h1>
            <p className="text-muted-foreground text-sm mt-2 text-center">
              {inviteEmail 
                ? "Davet edildiniz! Kayıt olarak ekibe katılın." 
                : planId
                  ? "Hesabınızı oluşturun, ardından ödemeye geçin."
                  : "Yeni bir hesap oluşturarak başlayın."}
            </p>
          </div>

          {/* 🆕 Plan Seçili Badge */}
          {planId && (
            <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Plan seçildi</p>
                <p className="text-xs text-muted-foreground">Kayıt sonrası ödeme sayfasına yönlendirileceksiniz</p>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Seçili
              </Badge>
            </div>
          )}

          {/* Davet Bilgisi */}
          {inviteEmail && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm">
              <p className="text-emerald-700 dark:text-emerald-400">
                <span className="font-semibold">Davet:</span> {inviteEmail}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Ad Soyad */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Ad Soyad</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="fullName"
                  type="text"
                  placeholder="Örn: Ünal İsi"
                  className="pl-10 bg-white dark:bg-slate-900/50 border-border text-foreground focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* E-posta */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">E-Posta Adresi</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="email"
                  type="email"
                  placeholder="ornek@sirket.com"
                  defaultValue={inviteEmail || ""}
                  className="pl-10 bg-white dark:bg-slate-900/50 border-border text-foreground focus:border-emerald-500 transition-colors"
                  required
                  readOnly={!!inviteEmail}
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="password"
                  type="password"
                  placeholder="En az 6 karakter"
                  className="pl-10 bg-white dark:bg-slate-900/50 border-border text-foreground focus:border-emerald-500 transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Şifre Tekrar */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Şifre Tekrar</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  className="pl-10 bg-white dark:bg-slate-900/50 border-border text-foreground focus:border-emerald-500 transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 h-11 shadow-lg shadow-emerald-500/25"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  {planId ? "Hesap Oluştur ve Devam Et" : "Hesap Oluştur"} 
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Login Link - Plan parametresi taşınıyor */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Zaten hesabınız var mı?{" "}
              <Link
                href={loginHref}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold transition-colors"
              >
                Giriş Yapın
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Kayıt olarak{" "}
            <span className="text-foreground/70">Kullanım Şartları</span> ve{" "}
            <span className="text-foreground/70">Gizlilik Politikası</span>'nı
            kabul etmiş olursunuz.
          </div>
        </div>
      </div>
    </div>
  );
}
