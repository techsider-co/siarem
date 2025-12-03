"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function register(formData: FormData, locale: string) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const planId = formData.get("planId") as string | null; // 🆕 Plan ID

  // 1. Kullanıcıyı oluştur
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    // Hata mesajlarını Türkçeleştir
    let errorMessage = signUpError.message;
    if (signUpError.message.includes("already registered")) {
      errorMessage = "Bu e-posta adresi zaten kayıtlı.";
    } else if (signUpError.message.includes("Password")) {
      errorMessage = "Şifre en az 6 karakter olmalıdır.";
    } else if (signUpError.message.includes("valid email")) {
      errorMessage = "Geçerli bir e-posta adresi giriniz.";
    }
    return { error: errorMessage };
  }

  // 2. Kullanıcı oluşturuldu, şimdi profile'a full_name ve email ekle
  // NOT: handle_new_user trigger'ı otomatik olarak:
  //   - Organizasyon oluşturur
  //   - org_members'a owner olarak ekler
  //   - profiles tablosuna kayıt ekler
  // Biz full_name ve email'i güncelliyoruz

  if (authData.user) {
    await supabase
      .from("profiles")
      .update({ 
        full_name: fullName,
        email: email.toLowerCase().trim()
      })
      .eq("id", authData.user.id);
  }

  // 3. Otomatik login yap (email verification kapalıysa)
  // Supabase ayarlarında "Confirm email" kapalıysa direkt login olur
  
  revalidatePath("/", "layout");
  
  // 🆕 4. Plan ID varsa checkout ara katmanına, yoksa dashboard'a yönlendir
  if (planId) {
    // Checkout Start sayfasına yönlendir
    redirect(`/${locale}/checkout/start?plan=${planId}`);
  } else {
    // Dashboard'a yönlendir
    const dashboardPath = locale === 'tr' ? '/yonetim-paneli' : locale === 'de' ? '/instrumententafel' : '/dashboard';
    redirect(`/${locale}${dashboardPath}`);
  }
}
