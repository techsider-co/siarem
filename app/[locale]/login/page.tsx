"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Rocket, Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Arka Plan Efektleri */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617] -z-10"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>

      {/* Login Kartı */}
      <div className="w-full max-w-md bg-slate-950/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative group">
        {/* Neon Border Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        
        <div className="relative">
            <div className="flex flex-col items-center mb-8">
                <img className="w-64" src="/images/logo-dark-clear.png" alt="" />
                <p className="text-white text-sm mt-2">Yönetim paneline erişim sağlayın.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label className="text-slate-300">Kurum E-Postanız</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input 
                            name="email" 
                            type="email" 
                            placeholder="unalisi@unalisi.dev" 
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-blue-500 transition-colors" 
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300">Şifreniz</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input 
                            name="password" 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white focus:border-blue-500 transition-colors" 
                            required
                        />
                    </div>
                </div>

                <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 h-11"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Giriş Yap"}
                </Button>
            </form>

            <div className="mt-6 text-center text-xs text-white">
                Sadece yetkili personel girişi içindir.
                <br />IP adresiniz kaydedilmektedir.
            </div>
        </div>
      </div>
    </div>
  );
}

