import createNextIntlPlugin from 'next-intl/plugin';

// KRİTİK DÜZELTME: Parantez içine dosya yolunu açıkça yazıyoruz.
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Diğer ayarların buraya gelebilir
  /* images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  }, 
  */
};

export default withNextIntl(nextConfig);