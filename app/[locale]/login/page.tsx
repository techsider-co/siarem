"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Rocket, Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";
import { Link } from "@/navigation";

export default function LoginPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await login(formData, locale);

    if (result?.error) {
        toast.error("Giriş Başarısız: " + result.error);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-[#020617] dark:to-[#020617]">
      {/* Arka Plan Efektleri - Light Mode */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
      
      {/* Dekoratif Grid - Light Mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] -z-10 opacity-50"></div>

      {/* Login Kartı */}
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-950/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-2xl relative group">
        {/* Neon Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-10 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-500 blur"></div>
        
        <div className="relative">
            <div className="flex flex-col items-center mb-8">
                {/* Light/Dark mode logo */}
                <img className="w-64 dark:hidden" src="/images/logo-light-clear.png" alt="Logo" />
                <img className="w-64 hidden dark:block" src="/images/logo-dark-clear.png" alt="Logo" />
                <p className="text-muted-foreground text-sm mt-2">Yönetim paneline erişim sağlayın.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-muted-foreground">Kurum E-Postanız</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                            name="email" 
                            type="email" 
                            placeholder="unalisi@unalisi.dev" 
                            className="pl-10 bg-white dark:bg-slate-900/50 border-border text-foreground focus:border-primary transition-colors" 
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-muted-foreground">Şifreniz</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                            name="password" 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10 bg-white dark:bg-slate-900/50 border-border text-foreground focus:border-primary transition-colors" 
                            required
                        />
                    </div>
                </div>

                <Button 
                    type="submit" 
                    className="w-full bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground border-0 h-11 shadow-lg shadow-primary/25"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Giriş Yap"}
                </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Hesabınız yok mu?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Kayıt Olun
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
                Sadece yetkili personel girişi içindir.
                <br />IP adresiniz kaydedilmektedir.
            </div>
        </div>
      </div>
    </div>
  );
}
