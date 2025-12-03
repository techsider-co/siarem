// navigation.ts
import {createNavigation} from 'next-intl/navigation';
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // Desteklenen diller
  locales: ['tr', 'en', 'de'],
  
  // Varsayılan dil
  defaultLocale: 'tr',

  // URL Haritası - SEO uyumlu dinamik URL'ler
  pathnames: {
    '/': '/',
    '/login': {
      en: '/login',
      tr: '/giris-yap',
      de: '/anmeldung'
    },
    '/register': {
      en: '/register',
      tr: '/kayit-ol',
      de: '/registrieren'
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
    },
    '/settings/organization': {
      en: '/settings/organization',
      tr: '/ayarlar/organizasyon',
      de: '/einstellungen/organisation'
    },
    '/settings/team': {
      en: '/settings/team',
      tr: '/ayarlar/ekip',
      de: '/einstellungen/team'
    },
    '/settings/billing': {
      en: '/settings/billing',
      tr: '/ayarlar/faturalama',
      de: '/einstellungen/abrechnung'
    },
    '/pricing': {
      en: '/pricing',
      tr: '/fiyatlandirma',
      de: '/preise'
    },
    '/checkout/start': {
      en: '/checkout/start',
      tr: '/odeme/baslat',
      de: '/kasse/starten'
    },
    '/onboarding': {
      en: '/onboarding',
      tr: '/baslangic',
      de: '/einrichtung'
    }
  }
});

// Navigasyon araçlarını oluştur ve dışa aktar
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);