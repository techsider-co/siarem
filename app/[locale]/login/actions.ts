"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData, locale: string) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const planId = formData.get("planId") as string | null; // 🆕 Plan ID
  const redirectUrl = formData.get("redirect") as string | null; // 🆕 Redirect URL

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Hata mesajlarını Türkçeleştir
    let errorMessage = error.message;
    if (error.message.includes("Invalid login credentials")) {
      errorMessage = "E-posta veya şifre hatalı.";
    } else if (error.message.includes("Email not confirmed")) {
      errorMessage = "E-posta adresinizi onaylayın.";
    }
    return { error: errorMessage };
  }

  revalidatePath("/", "layout");
  
  // 🆕 Yönlendirme mantığı
  // 1. Plan varsa checkout'a
  // 2. Redirect URL varsa oraya
  // 3. Yoksa dashboard'a
  
  if (planId) {
    redirect(`/${locale}/checkout/start?plan=${planId}`);
  } else if (redirectUrl) {
    redirect(`/${locale}${redirectUrl}`);
  } else {
    const dashboardPath = locale === 'tr' ? '/yonetim-paneli' : locale === 'de' ? '/instrumententafel' : '/dashboard';
    redirect(`/${locale}${dashboardPath}`);
  }
}
