import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './navigation';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Önce locale yönlendirmesini yap (next-intl)
  // Bu, /en, /tr gibi URL'leri doğru şekilde işler
  const intlResponse = intlMiddleware(request);
  
  // 2. Eğer intl bir yönlendirme yaptıysa (3xx status), onu döndür
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }
  
  // 3. Locale yönlendirmesi yapıldıktan sonra Supabase Auth kontrolü
  const authResponse = await updateSession(request);
  
  // 4. Eğer Auth bir yönlendirme yaptıysa, onu döndür
  if (authResponse.status >= 300 && authResponse.status < 400) {
    return authResponse;
  }
  
  // 5. Her iki middleware de yönlendirme yapmadıysa, intl response'u döndür
  return intlResponse;
}
 
export const config = {
  // Sadece api, static dosyalar ve resimleri hariç tut
  matcher: ['/((?!api|_next|.*\\..*).*)']
};