// utils/check-limits.ts
// Dynamic limit checker that reads from database (synced from Stripe)
// Stripe Metadata is the Source of Truth

import { createClient } from '@/utils/supabase/server';

// ==========================================
// TYPES
// ==========================================

export type LimitType = 
  | 'max_users' 
  | 'max_org' 
  | 'max_projects' 
  | 'max_customers' 
  | 'max_proposals';

export type FeatureType = 
  | 'can_remove_branding' 
  | 'smtp' 
  | 'api_usage' 
  | 'advanced_reporting' 
  | 'primary_support' 
  | 'white_label' 
  | 'custom_domain';

export interface UsageLimits {
  max_users: number;
  max_org: number;
  max_projects: number;
  max_customers: number;
  max_proposals: number;
}

export interface Features {
  can_remove_branding: boolean;
  smtp: boolean;
  api_usage: boolean;
  advanced_reporting: boolean;
  primary_support: boolean;
  white_label: boolean;
  custom_domain: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  message?: string;
}

// Default Free Plan values (used when no data in DB)
const FREE_PLAN_LIMITS: UsageLimits = {
  max_users: 1,
  max_org: 1,
  max_projects: 3,
  max_customers: 5,
  max_proposals: 3,
};

const FREE_PLAN_FEATURES: Features = {
  can_remove_branding: false,
  smtp: false,
  api_usage: false,
  advanced_reporting: false,
  primary_support: false,
  white_label: false,
  custom_domain: false,
};

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Check if an organization can add more of a resource based on Stripe limits
 * @param orgId - Organization UUID
 * @param limitType - The type of limit to check
 * @returns LimitCheckResult with detailed information
 */
export async function checkDynamicLimit(
  orgId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  const supabase = await createClient();

  // 1. Fetch the organization's usage_limits from database
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('usage_limits, subscription_plan')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    console.error('[checkDynamicLimit] Error fetching org:', orgError);
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      remaining: 0,
      isUnlimited: false,
      message: 'Organizasyon bulunamadı',
    };
  }

  // 2. Get the limit value (from DB or fallback to free plan)
  const usageLimits = (org.usage_limits as UsageLimits) || FREE_PLAN_LIMITS;
  const limit = usageLimits[limitType] ?? FREE_PLAN_LIMITS[limitType];

  // 3. -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentCount: 0,
      limit: -1,
      remaining: Infinity,
      isUnlimited: true,
    };
  }

  // 4. Get current count based on limit type
  const currentCount = await getCurrentCount(supabase, orgId, limitType);

  // 5. Calculate result
  const allowed = currentCount < limit;
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed,
    currentCount,
    limit,
    remaining,
    isUnlimited: false,
    message: allowed 
      ? undefined 
      : `${getLimitDisplayName(limitType)} limitine ulaştınız (${currentCount}/${limit})`,
  };
}

/**
 * Check if an organization has access to a feature based on Stripe metadata
 */
export async function checkFeatureAccess(
  orgId: string,
  featureType: FeatureType
): Promise<boolean> {
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('features, subscription_plan')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    console.error('[checkFeatureAccess] Error:', error);
    return false;
  }

  const features = (org.features as Features) || FREE_PLAN_FEATURES;
  return features[featureType] ?? FREE_PLAN_FEATURES[featureType];
}

/**
 * Get all limits and features for an organization
 */
export async function getOrganizationCapabilities(orgId: string): Promise<{
  limits: UsageLimits;
  features: Features;
  plan: string;
}> {
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('usage_limits, features, subscription_plan')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    return {
      limits: FREE_PLAN_LIMITS,
      features: FREE_PLAN_FEATURES,
      plan: 'free',
    };
  }

  return {
    limits: (org.usage_limits as UsageLimits) || FREE_PLAN_LIMITS,
    features: (org.features as Features) || FREE_PLAN_FEATURES,
    plan: org.subscription_plan || 'free',
  };
}

/**
 * Require a limit check - throws error if limit exceeded
 * Use this in Server Actions
 */
export async function requireLimit(
  orgId: string,
  limitType: LimitType
): Promise<void> {
  const result = await checkDynamicLimit(orgId, limitType);

  if (!result.allowed) {
    throw new LimitExceededError(
      result.message || `${getLimitDisplayName(limitType)} limitine ulaşıldı`,
      {
        limitType,
        currentCount: result.currentCount,
        limit: result.limit,
      }
    );
  }
}

/**
 * Require a feature access - throws error if not available
 * Use this in Server Actions
 */
export async function requireFeature(
  orgId: string,
  featureType: FeatureType
): Promise<void> {
  const hasAccess = await checkFeatureAccess(orgId, featureType);

  if (!hasAccess) {
    throw new FeatureNotAvailableError(
      `${getFeatureDisplayName(featureType)} özelliği mevcut planınızda bulunmuyor`,
      { featureType }
    );
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function getCurrentCount(
  supabase: any,
  orgId: string,
  limitType: LimitType
): Promise<number> {
  let count = 0;

  switch (limitType) {
    case 'max_users': {
      const { count: memberCount } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active');
      count = memberCount || 0;
      break;
    }

    case 'max_projects': {
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      count = projectCount || 0;
      break;
    }

    case 'max_customers': {
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_archived', false);
      count = customerCount || 0;
      break;
    }

    case 'max_proposals': {
      const { count: proposalCount } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_archived', false);
      count = proposalCount || 0;
      break;
    }

    case 'max_org': {
      // For this, we need to count orgs owned by the user
      // First get the owner_id
      const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', orgId)
        .single();

      if (org?.owner_id) {
        const { count: orgCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', org.owner_id);
        count = orgCount || 0;
      }
      break;
    }
  }

  return count;
}

function getLimitDisplayName(limitType: LimitType): string {
  const names: Record<LimitType, string> = {
    max_users: 'Kullanıcı',
    max_org: 'Organizasyon',
    max_projects: 'Proje',
    max_customers: 'Müşteri',
    max_proposals: 'Teklif',
  };
  return names[limitType];
}

function getFeatureDisplayName(featureType: FeatureType): string {
  const names: Record<FeatureType, string> = {
    can_remove_branding: 'Marka Kaldırma',
    smtp: 'SMTP Entegrasyonu',
    api_usage: 'API Erişimi',
    advanced_reporting: 'Gelişmiş Raporlama',
    primary_support: 'Öncelikli Destek',
    white_label: 'White Label',
    custom_domain: 'Özel Alan Adı',
  };
  return names[featureType];
}

// ==========================================
// CUSTOM ERRORS
// ==========================================

export class LimitExceededError extends Error {
  code = 'LIMIT_EXCEEDED';
  details: {
    limitType: LimitType;
    currentCount: number;
    limit: number;
  };

  constructor(message: string, details: { limitType: LimitType; currentCount: number; limit: number }) {
    super(message);
    this.name = 'LimitExceededError';
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...this.details,
    };
  }
}

export class FeatureNotAvailableError extends Error {
  code = 'FEATURE_NOT_AVAILABLE';
  details: {
    featureType: FeatureType;
  };

  constructor(message: string, details: { featureType: FeatureType }) {
    super(message);
    this.name = 'FeatureNotAvailableError';
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...this.details,
    };
  }
}

// ==========================================
// SERVER ACTION WRAPPER
// ==========================================

/**
 * Wrapper for server actions that need limit checking
 * @example
 * export async function createProject(orgId: string, data: any) {
 *   return withLimitCheck(orgId, 'max_projects', async () => {
 *     // Create project logic
 *   });
 * }
 */
export async function withLimitCheck<T>(
  orgId: string,
  limitType: LimitType,
  action: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string; code: string; details?: any }> {
  try {
    await requireLimit(orgId, limitType);
    const data = await action();
    return { success: true, data };
  } catch (error) {
    if (error instanceof LimitExceededError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      };
    }
    throw error;
  }
}

/**
 * Wrapper for server actions that need feature checking
 */
export async function withFeatureCheck<T>(
  orgId: string,
  featureType: FeatureType,
  action: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string; code: string; details?: any }> {
  try {
    await requireFeature(orgId, featureType);
    const data = await action();
    return { success: true, data };
  } catch (error) {
    if (error instanceof FeatureNotAvailableError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      };
    }
    throw error;
  }
}

