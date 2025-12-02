import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
import {routing} from './navigation';
 
export default getRequestConfig(async ({requestLocale}) => {
  // requestLocale'den locale'i al
  let locale = await requestLocale;
  
  // Gelen locale bizim routing ayarımızda var mı kontrol et
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
 
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});