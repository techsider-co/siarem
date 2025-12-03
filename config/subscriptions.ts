// config/subscriptions.ts
// Centralized subscription configuration with type safety

// ==========================================
// TYPES
// ==========================================

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';
export type BillingCycle = 'month' | 'year';
export type Currency = 'usd' | 'try';

export interface PlanFeatures {
  smtp: boolean;
  removeBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  advancedAnalytics: boolean;
}

export interface PlanLimits {
  maxOrganizations: number;
  maxUsers: number;
  maxProjects: number;
  maxCustomers: number;
  maxProposals: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  features: PlanFeatures;
  limits: PlanLimits;
  prices: {
    usd: { monthly: string | null; yearly: string | null };
    try: { monthly: string | null; yearly: string | null };
  };
  trialDays: number;
  highlight?: boolean;
}

// ==========================================
// STRIPE PRICE ID MAPPING
// ==========================================

// Environment variables for Stripe Price IDs
export const STRIPE_PRICE_IDS = {
  // USD Prices
  STARTER_MONTHLY_USD: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_USD || process.env.STRIPE_STARTER_MONTHLY_USD,
  STARTER_YEARLY_USD: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_USD || process.env.STRIPE_STARTER_YEARLY_USD,
  PRO_MONTHLY_USD: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_USD || process.env.STRIPE_PRO_MONTHLY_USD,
  PRO_YEARLY_USD: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_USD || process.env.STRIPE_PRO_YEARLY_USD,
  ENTERPRISE_MONTHLY_USD: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_USD || process.env.STRIPE_ENTERPRISE_MONTHLY_USD,
  ENTERPRISE_YEARLY_USD: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_USD || process.env.STRIPE_ENTERPRISE_YEARLY_USD,
  
  // TRY Prices
  STARTER_MONTHLY_TRY: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_TRY || process.env.STRIPE_STARTER_MONTHLY_TRY,
  STARTER_YEARLY_TRY: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_TRY || process.env.STRIPE_STARTER_YEARLY_TRY,
  PRO_MONTHLY_TRY: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_TRY || process.env.STRIPE_PRO_MONTHLY_TRY,
  PRO_YEARLY_TRY: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_TRY || process.env.STRIPE_PRO_YEARLY_TRY,
  ENTERPRISE_MONTHLY_TRY: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_TRY || process.env.STRIPE_ENTERPRISE_MONTHLY_TRY,
  ENTERPRISE_YEARLY_TRY: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_TRY || process.env.STRIPE_ENTERPRISE_YEARLY_TRY,
} as const;

// ==========================================
// PLAN CONFIGURATIONS
// ==========================================

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Ücretsiz',
    description: 'Başlangıç için ideal',
    features: {
      smtp: false,
      removeBranding: false,
      apiAccess: false,
      prioritySupport: false,
      customDomain: false,
      whiteLabel: false,
      advancedAnalytics: false,
    },
    limits: {
      maxOrganizations: 1,
      maxUsers: 1,
      maxProjects: 3,
      maxCustomers: 5,
      maxProposals: 3,
    },
    prices: {
      usd: { monthly: null, yearly: null },
      try: { monthly: null, yearly: null },
    },
    trialDays: 0,
  },
  starter: {
    id: 'starter',
    name: 'Başlangıç',
    description: 'Küçük ekipler için',
    features: {
      smtp: false,
      removeBranding: true,
      apiAccess: false,
      prioritySupport: false,
      customDomain: false,
      whiteLabel: false,
      advancedAnalytics: false,
    },
    limits: {
      maxOrganizations: 1,
      maxUsers: 3,
      maxProjects: 10,
      maxCustomers: 50,
      maxProposals: 1000,
    },
    prices: {
      usd: {
        monthly: STRIPE_PRICE_IDS.STARTER_MONTHLY_USD || null,
        yearly: STRIPE_PRICE_IDS.STARTER_YEARLY_USD || null,
      },
      try: {
        monthly: STRIPE_PRICE_IDS.STARTER_MONTHLY_TRY || null,
        yearly: STRIPE_PRICE_IDS.STARTER_YEARLY_TRY || null,
      },
    },
    trialDays: 14,
  },
  pro: {
    id: 'pro',
    name: 'Profesyonel',
    description: 'Büyüyen işletmeler için',
    features: {
      smtp: true,
      removeBranding: true,
      apiAccess: true,
      prioritySupport: true,
      customDomain: false,
      whiteLabel: false,
      advancedAnalytics: true,
    },
    limits: {
      maxOrganizations: 3,
      maxUsers: 10,
      maxProjects: 50,
      maxCustomers: 10000,
      maxProposals: 10000,
    },
    prices: {
      usd: {
        monthly: STRIPE_PRICE_IDS.PRO_MONTHLY_USD || null,
        yearly: STRIPE_PRICE_IDS.PRO_YEARLY_USD || null,
      },
      try: {
        monthly: STRIPE_PRICE_IDS.PRO_MONTHLY_TRY || null,
        yearly: STRIPE_PRICE_IDS.PRO_YEARLY_TRY || null,
      },
    },
    trialDays: 14,
    highlight: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Kurumsal',
    description: 'Büyük organizasyonlar için',
    features: {
      smtp: true,
      removeBranding: true,
      apiAccess: true,
      prioritySupport: true,
      customDomain: true,
      whiteLabel: true,
      advancedAnalytics: true,
    },
    limits: {
      maxOrganizations: -1, // Unlimited
      maxUsers: -1,
      maxProjects: -1,
      maxCustomers: -1,
      maxProposals: -1,
    },
    prices: {
      usd: {
        monthly: STRIPE_PRICE_IDS.ENTERPRISE_MONTHLY_USD || null,
        yearly: STRIPE_PRICE_IDS.ENTERPRISE_YEARLY_USD || null,
      },
      try: {
        monthly: STRIPE_PRICE_IDS.ENTERPRISE_MONTHLY_TRY || null,
        yearly: STRIPE_PRICE_IDS.ENTERPRISE_YEARLY_TRY || null,
      },
    },
    trialDays: 14,
  },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get plan ID from Stripe Price ID
 */
export function getPlanIdFromPriceId(priceId: string | null): PlanId {
  if (!priceId) return 'free';

  for (const [planId, config] of Object.entries(PLANS)) {
    const { prices } = config;
    if (
      prices.usd.monthly === priceId ||
      prices.usd.yearly === priceId ||
      prices.try.monthly === priceId ||
      prices.try.yearly === priceId
    ) {
      return planId as PlanId;
    }
  }

  return 'free';
}

/**
 * Get billing cycle from Stripe Price ID
 */
export function getBillingCycleFromPriceId(priceId: string | null): BillingCycle | null {
  if (!priceId) return null;

  for (const config of Object.values(PLANS)) {
    const { prices } = config;
    if (prices.usd.monthly === priceId || prices.try.monthly === priceId) {
      return 'month';
    }
    if (prices.usd.yearly === priceId || prices.try.yearly === priceId) {
      return 'year';
    }
  }

  return null;
}

/**
 * Get currency from Stripe Price ID
 */
export function getCurrencyFromPriceId(priceId: string | null): Currency {
  if (!priceId) return 'usd';

  for (const config of Object.values(PLANS)) {
    const { prices } = config;
    if (prices.try.monthly === priceId || prices.try.yearly === priceId) {
      return 'try';
    }
  }

  return 'usd';
}

/**
 * Get plan configuration by ID
 */
export function getPlanConfig(planId: PlanId | string | null): PlanConfig {
  if (!planId || !(planId in PLANS)) {
    return PLANS.free;
  }
  return PLANS[planId as PlanId];
}

/**
 * Get price ID for a plan, currency, and billing cycle
 */
export function getPriceId(
  planId: PlanId,
  currency: Currency,
  billingCycle: BillingCycle
): string | null {
  const plan = PLANS[planId];
  if (!plan) return null;

  const priceKey = billingCycle === 'month' ? 'monthly' : 'yearly';
  return plan.prices[currency][priceKey];
}

/**
 * Check if a plan has a specific feature
 */
export function planHasFeature(
  planId: PlanId | string | null,
  feature: keyof PlanFeatures
): boolean {
  const plan = getPlanConfig(planId);
  return plan.features[feature];
}

/**
 * Get plan limit value
 */
export function getPlanLimit(
  planId: PlanId | string | null,
  limit: keyof PlanLimits
): number {
  const plan = getPlanConfig(planId);
  return plan.limits[limit];
}

/**
 * Check if count is within plan limit
 */
export function isWithinPlanLimit(
  planId: PlanId | string | null,
  limit: keyof PlanLimits,
  currentCount: number
): boolean {
  const limitValue = getPlanLimit(planId, limit);
  if (limitValue === -1) return true; // Unlimited
  return currentCount < limitValue;
}

/**
 * Get all available plans for display
 */
export function getAvailablePlans(): PlanConfig[] {
  return Object.values(PLANS).filter(plan => plan.id !== 'free');
}

/**
 * Compare two plans (returns -1, 0, or 1)
 */
export function comparePlans(planA: PlanId, planB: PlanId): number {
  const order: Record<PlanId, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    enterprise: 3,
  };
  return Math.sign(order[planA] - order[planB]);
}

/**
 * Check if upgrade is needed
 */
export function needsUpgrade(currentPlan: PlanId | string | null, requiredPlan: PlanId): boolean {
  const current = (currentPlan || 'free') as PlanId;
  return comparePlans(current, requiredPlan) < 0;
}

/**
 * Get trial days for a plan
 */
export function getTrialDays(planId: PlanId): number {
  return PLANS[planId]?.trialDays || 0;
}

// ==========================================
// DISPLAY HELPERS
// ==========================================

export const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  free: 'Ücretsiz',
  starter: 'Başlangıç',
  pro: 'Profesyonel',
  enterprise: 'Kurumsal',
};

export const FEATURE_DISPLAY_NAMES: Record<keyof PlanFeatures, string> = {
  smtp: 'Özel E-posta Sunucusu',
  removeBranding: 'Marka Kaldırma',
  apiAccess: 'API Erişimi',
  prioritySupport: 'Öncelikli Destek',
  customDomain: 'Özel Alan Adı',
  whiteLabel: 'White Label',
  advancedAnalytics: 'Gelişmiş Analitik',
};

export const LIMIT_DISPLAY_NAMES: Record<keyof PlanLimits, string> = {
  maxOrganizations: 'Organizasyon',
  maxUsers: 'Kullanıcı',
  maxProjects: 'Proje',
  maxCustomers: 'Müşteri',
  maxProposals: 'Teklif',
};

