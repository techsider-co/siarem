"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData, locale: string) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  
  // Locale prefix'li dashboard'a yönlendir
  // next-intl'in redirect'i server action'da çalışmadığı için manuel path oluşturuyoruz
  const dashboardPath = locale === 'tr' ? '/yonetim-paneli' : locale === 'de' ? '/instrumententafel' : '/dashboard';
  redirect(`/${locale}${dashboardPath}`);
}

