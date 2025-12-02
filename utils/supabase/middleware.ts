import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // GÜVENLİK KONTROLÜ
  // Locale prefix'i kontrol et (tr, en, de)
  const pathname = request.nextUrl.pathname;
  const localeMatch = pathname.match(/^\/(tr|en|de)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'tr';
  const pathWithoutLocale = localeMatch ? pathname.slice(locale.length + 1) || '/' : pathname;
  
  // Login path'lerini kontrol et
  const isLoginPage = pathWithoutLocale === '/login' || 
                      pathWithoutLocale === '/giris-yap' || 
                      pathWithoutLocale === '/anmeldung' ||
                      pathname === '/login' ||
                      pathname === '/giris-yap' ||
                      pathname === '/anmeldung';
  
  // Register path'lerini kontrol et
  const isRegisterPage = pathWithoutLocale === '/register' || 
                         pathWithoutLocale === '/kayit-ol' || 
                         pathWithoutLocale === '/registrieren' ||
                         pathname === '/register' ||
                         pathname === '/kayit-ol' ||
                         pathname === '/registrieren';
  
  // Auth sayfaları (login veya register)
  const isAuthPage = isLoginPage || isRegisterPage;
  
  // Landing page (ana sayfa) kontrolü - locale prefix'li veya prefix'siz
  // /tr, /tr/, /en, /en/ gibi URL'ler landing page'dir
  // pathWithoutLocale '/' olduğunda veya pathname sadece locale ise landing page'dir
  const isLandingPage = pathWithoutLocale === '/' || 
                        pathname === '/' ||
                        pathname === `/${locale}` ||
                        pathname === `/${locale}/`;
  
  // 1. Kullanıcı yoksa:
  //    - Landing page'de veya auth sayfalarındaysa (login/register) -> İzin ver
  //    - Diğer sayfalardaysa -> Login'e yönlendir
  if (!user) {
    if (isLandingPage || isAuthPage) {
      // Landing page veya auth sayfalarında, izin ver
      return response;
    }
    // Diğer sayfalarda, login'e yönlendir
    const loginPath = locale === 'tr' ? '/giris-yap' : locale === 'de' ? '/anmeldung' : '/login';
    const loginUrl = new URL(`/${locale}${loginPath}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Kullanıcı varsa:
  //    - Auth sayfalarındaysa (login/register) -> Dashboard'a yönlendir
  //    - Landing page'deyse -> Dashboard'a yönlendir
  if (user) {
    if (isAuthPage || isLandingPage) {
      // Dashboard path'ini locale'e göre oluştur
      const dashboardPath = locale === 'tr' ? '/yonetim-paneli' : locale === 'de' ? '/instrumententafel' : '/dashboard';
      const dashboardUrl = new URL(`/${locale}${dashboardPath}`, request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response
}