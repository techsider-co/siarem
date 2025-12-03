// lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover' as any,
  typescript: true,
});

// ==========================================
// TYPES
// ==========================================

export interface ProductWithPrices {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  prices: {
    id: string;
    unit_amount: number | null;
    currency: string;
    interval: 'month' | 'year';
  }[];
  metadata: {
    plan_id?: string;
    max_users?: string;
    max_projects?: string;
    max_customers?: string;
    max_proposals?: string;
    highlight?: string;
    order?: string;
    features?: string;
    [key: string]: string | undefined;
  };
}

export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxCustomers: number;
  maxProposals: number;
}

export interface PlanFeatures {
  smtp: boolean;
  removeBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  advancedAnalytics: boolean;
}

// ==========================================
// STRIPE PRODUCTS
// ==========================================

/**
 * Stripe'dan aktif ürünleri ve belirtilen para birimine göre fiyatları çeker
 * @param targetCurrency - 'usd' veya 'try' (varsayılan: 'usd')
 */
export async function getStripeProducts(targetCurrency: string = 'usd'): Promise<ProductWithPrices[]> {
  // 1. Tüm aktif ürünleri çek
  const { data: products } = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });

  // 2. Tüm aktif fiyatları çek
  const { data: prices } = await stripe.prices.list({
    active: true,
    limit: 100,
  });

  const productsWithPrices = products.map((product) => {
    // SADECE istenen para birimine ait fiyatları filtrele
    const productPrices = prices
      .filter((price) => 
        price.product === product.id && 
        price.currency.toLowerCase() === targetCurrency.toLowerCase()
      )
      .map((price) => ({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval as 'month' | 'year',
      }));

    // Metadata içindeki özellikleri array'e çevir (örn: features='a,b,c')
    const features = product.metadata.features 
      ? product.metadata.features.split(',').map((f) => f.trim()) 
      : [];

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      features,
      prices: productPrices,
      metadata: product.metadata as ProductWithPrices['metadata'],
    };
  });

  // Fiyatı olmayan (veya o para biriminde fiyatı olmayan) ürünleri listeden çıkar
  // ve sıralama yap (metadata.order varsa kullan, yoksa fiyata göre)
  return productsWithPrices
    .filter(p => p.prices.length > 0)
    .sort((a, b) => {
      const orderA = parseInt(a.metadata.order || '999');
      const orderB = parseInt(b.metadata.order || '999');
      if (orderA !== orderB) return orderA - orderB;
      return (a.prices[0]?.unit_amount || 0) - (b.prices[0]?.unit_amount || 0);
    });
}

// ==========================================
// PLAN LIMITS & FEATURES HELPERS
// ==========================================

/**
 * Stripe metadata'dan plan limitlerini çıkarır
 */
export function getPlanLimitsFromMetadata(metadata: ProductWithPrices['metadata']): PlanLimits {
  return {
    maxUsers: parseInt(metadata['max_users'] || metadata['max-users'] || '1'),
    maxProjects: parseInt(metadata['max_projects'] || metadata['max-projects'] || '5'),
    maxCustomers: parseInt(metadata['max_customers'] || metadata['max-customers'] || '50'),
    maxProposals: parseInt(metadata['max_proposals'] || metadata['max-proposals'] || '10'),
  };
}

/**
 * Stripe metadata'dan plan özelliklerini çıkarır
 */
export function getPlanFeaturesFromMetadata(metadata: ProductWithPrices['metadata']): PlanFeatures {
  const parseBoolean = (val: string | undefined) => val === 'true' || val === '1';
  
  return {
    smtp: parseBoolean(metadata.smtp),
    removeBranding: parseBoolean(metadata['remove_branding'] || metadata['removeBranding']),
    apiAccess: parseBoolean(metadata['api_access'] || metadata['apiAccess']),
    prioritySupport: parseBoolean(metadata['priority_support'] || metadata['prioritySupport']),
    customDomain: parseBoolean(metadata['custom_domain'] || metadata['customDomain']),
    whiteLabel: parseBoolean(metadata['white_label'] || metadata['whiteLabel']),
    advancedAnalytics: parseBoolean(metadata['advanced_analytics'] || metadata['advancedAnalytics']),
  };
}

/**
 * Plan'ın öne çıkarılıp çıkarılmayacağını kontrol eder (highlight)
 */
export function isPlanHighlighted(metadata: ProductWithPrices['metadata']): boolean {
  return metadata.highlight === 'true' || metadata.highlight === '1';
}

/**
 * Ülke kodundan para birimini belirler
 */
export function getCurrencyFromCountry(countryCode: string): 'try' | 'usd' {
  const tryCurrencyCountries = ['TR'];
  return tryCurrencyCountries.includes(countryCode.toUpperCase()) ? 'try' : 'usd';
}
