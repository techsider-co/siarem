// utils/limits.ts
// SaaS Plan Limitleri ve Özellik Kontrolleri
// Bu dosya, kullanıcının hangi planda olduğunu ve neleri yapabileceğini yönetir.
// Single Source of Truth for all plan limits and features.

// ==========================================
// PLAN CONFIGURATION (Single Source of Truth)
// ==========================================

export const PLAN_CONFIG = {
  free: {
    maxOrganizations: 1,  // FREE users can only have 1 organization
    maxUsers: 1,
    maxProjects: 3,
    maxCustomers: 5,      // Reduced for free tier
    maxProposals: 3,      // Reduced for free tier
    features: {
      smtp: false,
      removeBranding: false,
      apiAccess: false,
      prioritySupport: false,
      customDomain: false,
      whiteLabel: false,
      advancedAnalytics: false,
    }
  },
  starter: {
    maxOrganizations: 1,
    maxUsers: 3,
    maxProjects: 10,
    maxCustomers: 50,
    maxProposals: 1000,
    features: {
      smtp: false,
      removeBranding: true,
      apiAccess: false,
      prioritySupport: false,
      customDomain: false,
      whiteLabel: false,
      advancedAnalytics: false,
    }
  },
  pro: {
    maxOrganizations: 3,
    maxUsers: 10,
    maxProjects: 50,
    maxCustomers: 10000,
    maxProposals: 10000,
    features: {
      smtp: true,
      removeBranding: true,
      apiAccess: true,
      prioritySupport: true,
      customDomain: false,
      whiteLabel: false,
      advancedAnalytics: true,
    }
  },
  enterprise: {
    maxOrganizations: -1, // Unlimited
    maxUsers: -1,
    maxProjects: -1,
    maxCustomers: -1,
    maxProposals: -1,
    features: {
      smtp: true,
      removeBranding: true,
      apiAccess: true,
      prioritySupport: true,
      customDomain: true,
      whiteLabel: true,
      advancedAnalytics: true,
    }
  }
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;
export type FeatureKey = keyof typeof PLAN_CONFIG.free.features;
export type LimitKey = 'maxOrganizations' | 'maxUsers' | 'maxProjects' | 'maxCustomers' | 'maxProposals';

// ==========================================
// LIMIT CONTROL FUNCTIONS
// ==========================================

/**
 * Belirli bir limit için mevcut sayının plan limitini aşıp aşmadığını kontrol eder
 * @returns true = limit aşılmadı (işlem yapılabilir), false = limit aşıldı
 */
export function checkLimit(
  currentPlan: string, 
  currentCount: number, 
  limitKey: LimitKey
): boolean {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const limit = config[limitKey];
  
  // -1 = sınırsız
  if (limit === -1) return true;
  
  return currentCount < limit;
}

/**
 * Plan limitini döndürür
 */
export function getLimit(currentPlan: string, limitKey: LimitKey): number {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  return config[limitKey];
}

/**
 * Tüm plan limitlerini döndürür
 */
export function getAllLimits(currentPlan: string): Record<LimitKey, number> {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  
  return {
    maxOrganizations: config.maxOrganizations,
    maxUsers: config.maxUsers,
    maxProjects: config.maxProjects,
    maxCustomers: config.maxCustomers,
    maxProposals: config.maxProposals,
  };
}

/**
 * Kalan kotayı hesaplar
 */
export function getRemainingQuota(
  currentPlan: string, 
  currentCount: number, 
  limitKey: LimitKey
): number {
  const limit = getLimit(currentPlan, limitKey);
  
  // Sınırsız
  if (limit === -1) return Infinity;
  
  return Math.max(0, limit - currentCount);
}

/**
 * Limit kullanım yüzdesini hesaplar (0-100)
 */
export function getLimitUsagePercentage(
  currentPlan: string, 
  currentCount: number, 
  limitKey: LimitKey
): number {
  const limit = getLimit(currentPlan, limitKey);
  
  // Sınırsız
  if (limit === -1) return 0;
  
  return Math.min(100, Math.round((currentCount / limit) * 100));
}

// ==========================================
// FEATURE CONTROL FUNCTIONS
// ==========================================

/**
 * Belirli bir özelliğin mevcut planda aktif olup olmadığını kontrol eder
 */
export function hasFeature(currentPlan: string, featureKey: FeatureKey): boolean {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  return config.features[featureKey];
}

/**
 * Tüm özelliklerin durumunu döndürür
 */
export function getAllFeatures(currentPlan: string): Record<FeatureKey, boolean> {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  return { ...config.features };
}

/**
 * Özellik için gerekli minimum planı döndürür
 */
export function getRequiredPlanForFeature(featureKey: FeatureKey): PlanType {
  const plans: PlanType[] = ['free', 'starter', 'pro', 'enterprise'];
  
  for (const plan of plans) {
    if (PLAN_CONFIG[plan].features[featureKey]) {
      return plan;
    }
  }
  
  return 'enterprise'; // Hiçbir planda yoksa enterprise gerekli
}

// ==========================================
// PLAN COMPARISON
// ==========================================

/**
 * İki planı karşılaştırır
 * @returns -1 (plan1 < plan2), 0 (eşit), 1 (plan1 > plan2)
 */
export function comparePlans(plan1: string, plan2: string): number {
  const order: Record<PlanType, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    enterprise: 3,
  };
  
  const p1 = normalizePlanName(plan1);
  const p2 = normalizePlanName(plan2);
  
  return Math.sign((order[p1] || 0) - (order[p2] || 0));
}

/**
 * Plan upgrade gerekli mi kontrol eder
 */
export function needsUpgrade(
  currentPlan: string, 
  requiredPlan: PlanType
): boolean {
  return comparePlans(currentPlan, requiredPlan) < 0;
}

/**
 * Plan adını normalleştirir (lowercase, trim)
 */
export function normalizePlanName(plan: string | null | undefined): PlanType {
  if (!plan) return 'free';
  
  const normalized = plan.toLowerCase().trim() as PlanType;
  
  // Geçerli plan mı kontrol et
  if (normalized in PLAN_CONFIG) {
    return normalized;
  }
  
  return 'free';
}

// ==========================================
// DISPLAY HELPERS
// ==========================================

/**
 * Plan adını görüntülenecek formata çevirir
 */
export function getPlanDisplayName(plan: string): string {
  const displayNames: Record<PlanType, string> = {
    free: 'Ücretsiz',
    starter: 'Başlangıç',
    pro: 'Profesyonel',
    enterprise: 'Kurumsal',
  };
  
  const normalized = normalizePlanName(plan);
  return displayNames[normalized] || plan;
}

/**
 * Limit değerini görüntülenecek formata çevirir
 */
export function formatLimitValue(value: number): string {
  if (value === -1) return 'Sınırsız';
  if (value >= 10000) return '10K+';
  if (value >= 1000) return `${Math.floor(value / 1000)}K`;
  return value.toString();
}

// ==========================================
// UPGRADE PROMPTS
// ==========================================

export interface UpgradePrompt {
  title: string;
  description: string;
  requiredPlan: PlanType;
  currentLimit?: number;
}

/**
 * Limit aşıldığında gösterilecek upgrade mesajını döndürür
 */
export function getLimitExceededPrompt(limitKey: LimitKey, currentPlan: string): UpgradePrompt {
  const plan = normalizePlanName(currentPlan);
  const limit = getLimit(currentPlan, limitKey);
  
  const prompts: Record<LimitKey, { title: string; description: string }> = {
    maxOrganizations: {
      title: 'Organizasyon Limitine Ulaşıldı',
      description: 'Daha fazla organizasyon oluşturmak için planınızı yükseltin.',
    },
    maxUsers: {
      title: 'Kullanıcı Limitine Ulaşıldı',
      description: 'Daha fazla ekip üyesi eklemek için planınızı yükseltin.',
    },
    maxProjects: {
      title: 'Proje Limitine Ulaşıldı',
      description: 'Daha fazla proje oluşturmak için planınızı yükseltin.',
    },
    maxCustomers: {
      title: 'Müşteri Limitine Ulaşıldı',
      description: 'Daha fazla müşteri eklemek için planınızı yükseltin.',
    },
    maxProposals: {
      title: 'Teklif Limitine Ulaşıldı',
      description: 'Daha fazla teklif oluşturmak için planınızı yükseltin.',
    },
  };
  
  // Bir sonraki planı bul
  const planOrder: PlanType[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(plan);
  const requiredPlan = planOrder[Math.min(currentIndex + 1, planOrder.length - 1)];
  
  return {
    ...prompts[limitKey],
    requiredPlan,
    currentLimit: limit,
  };
}

/**
 * Özellik için upgrade mesajını döndürür
 */
export function getFeatureUpgradePrompt(featureKey: FeatureKey): UpgradePrompt {
  const prompts: Record<FeatureKey, { title: string; description: string }> = {
    smtp: {
      title: 'Özel E-posta Sunucusu',
      description: 'Kendi SMTP sunucunuzu kullanmak için planınızı yükseltin.',
    },
    removeBranding: {
      title: 'Markasız Kullanım',
      description: 'Unalisi markasını kaldırmak için planınızı yükseltin.',
    },
    apiAccess: {
      title: 'API Erişimi',
      description: 'API üzerinden entegrasyon için planınızı yükseltin.',
    },
    prioritySupport: {
      title: 'Öncelikli Destek',
      description: 'Öncelikli destek almak için planınızı yükseltin.',
    },
    customDomain: {
      title: 'Özel Alan Adı',
      description: 'Kendi alan adınızı kullanmak için planınızı yükseltin.',
    },
    whiteLabel: {
      title: 'White Label',
      description: 'Tamamen markanızla sunmak için planınızı yükseltin.',
    },
    advancedAnalytics: {
      title: 'Gelişmiş Analitik',
      description: 'Detaylı raporlar için planınızı yükseltin.',
    },
  };
  
  return {
    ...prompts[featureKey],
    requiredPlan: getRequiredPlanForFeature(featureKey),
  };
}

// ==========================================
// ORGANIZATION LIMIT HELPERS
// ==========================================

/**
 * Check if user can create a new organization based on their plan
 */
export function canCreateOrganization(currentPlan: string, ownedOrgsCount: number): boolean {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  
  // -1 = unlimited
  if (config.maxOrganizations === -1) return true;
  
  return ownedOrgsCount < config.maxOrganizations;
}

/**
 * Get the organization limit for a plan
 */
export function getOrganizationLimit(currentPlan: string): number {
  const plan = normalizePlanName(currentPlan);
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  return config.maxOrganizations;
}

/**
 * Get upgrade prompt for organization limit
 */
export function getOrganizationLimitPrompt(currentPlan: string): UpgradePrompt {
  const plan = normalizePlanName(currentPlan);
  const limit = getOrganizationLimit(currentPlan);
  
  const planOrder: PlanType[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(plan);
  const requiredPlan = planOrder[Math.min(currentIndex + 1, planOrder.length - 1)];
  
  return {
    title: 'Organizasyon Limitine Ulaşıldı',
    description: `Mevcut planınızda maksimum ${limit} organizasyon oluşturabilirsiniz. Daha fazla organizasyon için planınızı yükseltin.`,
    requiredPlan,
    currentLimit: limit,
  };
}

// ==========================================
// RESOURCE LIMIT CHECK HELPERS
// ==========================================

export interface LimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  percentage: number;
}

/**
 * Comprehensive limit check with detailed result
 */
export function checkLimitWithDetails(
  currentPlan: string,
  currentCount: number,
  limitKey: LimitKey
): LimitCheckResult {
  const limit = getLimit(currentPlan, limitKey);
  const isUnlimited = limit === -1;
  
  return {
    allowed: isUnlimited || currentCount < limit,
    currentCount,
    limit,
    remaining: isUnlimited ? Infinity : Math.max(0, limit - currentCount),
    percentage: isUnlimited ? 0 : Math.min(100, Math.round((currentCount / limit) * 100)),
  };
}

/**
 * Check if user can create a resource (proposal, customer, project)
 */
export function canCreate(
  currentPlan: string,
  resourceType: 'proposal' | 'customer' | 'project' | 'user' | 'organization',
  currentCount: number
): boolean {
  const limitKeyMap: Record<string, LimitKey> = {
    proposal: 'maxProposals',
    customer: 'maxCustomers',
    project: 'maxProjects',
    user: 'maxUsers',
    organization: 'maxOrganizations',
  };
  
  const limitKey = limitKeyMap[resourceType];
  if (!limitKey) return true;
  
  return checkLimit(currentPlan, currentCount, limitKey);
}

/**
 * Get limit for a resource type
 */
export function getResourceLimit(
  currentPlan: string,
  resourceType: 'proposal' | 'customer' | 'project' | 'user' | 'organization'
): number {
  const limitKeyMap: Record<string, LimitKey> = {
    proposal: 'maxProposals',
    customer: 'maxCustomers',
    project: 'maxProjects',
    user: 'maxUsers',
    organization: 'maxOrganizations',
  };
  
  const limitKey = limitKeyMap[resourceType];
  if (!limitKey) return -1;
  
  return getLimit(currentPlan, limitKey);
}

