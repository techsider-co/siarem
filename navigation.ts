import {createNavigation} from 'next-intl/navigation';
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // Desteklenen diller
  locales: ['tr', 'en', 'de'],
  
  // Varsayılan dil
  defaultLocale: 'tr',

  // URL Haritası (Localized Pathnames) - SEO uyumlu dinamik URL'ler
  pathnames: {
    '/': '/',
    '/login': {
      en: '/login',
      tr: '/giris-yap',
      de: '/anmeldung'
    },
    '/dashboard': {
      en: '/dashboard',
      tr: '/yonetim-paneli',
      de: '/instrumententafel'
    },
    '/projects': {
      en: '/projects',
      tr: '/projeler',
      de: '/projekte'
    },
    '/projects/[id]': {
      en: '/projects/[id]',
      tr: '/projeler/[id]',
      de: '/projekte/[id]'
    },
    '/customers': {
      en: '/customers',
      tr: '/musteriler',
      de: '/kunden'
    },
    '/proposals': {
      en: '/proposals',
      tr: '/teklifler',
      de: '/angebote'
    },
    '/proposals/create': {
      en: '/proposals/create',
      tr: '/teklifler/olustur',
      de: '/angebote/erstellen'
    },
    '/contracts': {
      en: '/contracts',
      tr: '/sozlesmeler',
      de: '/vertraege'
    },
    '/contracts/create': {
      en: '/contracts/create',
      tr: '/sozlesmeler/olustur',
      de: '/vertraege/erstellen'
    },
    '/finance': {
      en: '/finance',
      tr: '/finans',
      de: '/finanzen'
    },
    '/archive': {
      en: '/archive',
      tr: '/arsiv',
      de: '/archiv'
    },
    '/settings': {
      en: '/settings',
      tr: '/ayarlar',
      de: '/einstellungen'
    }
  }
});

// Navigasyon araçlarını oluştur ve dışa aktar
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);