// utils/permissions.ts
// Server-side permission checking utility
// This reads from the cached features/limits in the organizations table

import { createClient } from '@/utils/supabase/server';
import { PLANS, type PlanId, type PlanFeatures, type PlanLimits } from '@/config/subscriptions';

// ==========================================
// TYPES
// ==========================================

export type LimitKey = keyof PlanLimits;
export type FeatureKey = keyof PlanFeatures;

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  requiredPlan?: PlanId;
}

export interface OrganizationPermissions {
  features: PlanFeatures;
  limits: PlanLimits;
  plan: PlanId;
  status: string;
  isTrialing: boolean;
  trialEndsAt: Date | null;
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Get organization permissions (cached from Stripe via webhook)
 */
export async function getOrganizationPermissions(orgId: string): Promise<OrganizationPermissions | null> {
  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('subscription_plan, subscription_status, features, usage_limits, trial_ends_at')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    console.error('[getOrganizationPermissions] Error:', error);
    return null;
  }

  const plan = (org.subscription_plan || 'free') as PlanId;
  const defaultConfig = PLANS[plan] || PLANS.free;

  return {
    plan,
    status: org.subscription_status || 'inactive',
    isTrialing: org.subscription_status === 'trialing',
    trialEndsAt: org.trial_ends_at ? new Date(org.trial_ends_at) : null,
    features: {
      ...defaultConfig.features,
      ...(org.features as Partial<PlanFeatures> || {}),
    },
    limits: {
      ...defaultConfig.limits,
      ...(org.usage_limits as Partial<PlanLimits> || {}),
    },
  };
}

/**
 * Check if organization has access to a specific feature
 */
export async function hasFeature(orgId: string, feature: FeatureKey): Promise<boolean> {
  const permissions = await getOrganizationPermissions(orgId);
  
  if (!permissions) {
    // Fallback to free plan features
    return PLANS.free.features[feature];
  }

  return permissions.features[feature] ?? PLANS.free.features[feature];
}

/**
 * Check if organization is within a specific limit
 */
export async function checkLimit(
  orgId: string,
  limitKey: LimitKey,
  currentCount?: number
): Promise<PermissionCheckResult> {
  const permissions = await getOrganizationPermissions(orgId);
  
  if (!permissions) {
    return {
      allowed: false,
      reason: 'Organization not found',
    };
  }

  const limit = permissions.limits[limitKey];

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      currentCount,
    };
  }

  // If currentCount is provided, check against it
  if (currentCount !== undefined) {
    const allowed = currentCount < limit;
    return {
      allowed,
      reason: allowed ? undefined : `Limit exceeded: ${currentCount}/${limit}`,
      currentCount,
      limit,
      requiredPlan: allowed ? undefined : getNextPlanWithHigherLimit(permissions.plan, limitKey),
    };
  }

  return {
    allowed: true,
    limit,
  };
}

/**
 * Get current count and check limit in one call
 */
export async function checkLimitWithCount(
  orgId: string,
  limitKey: LimitKey,
  countQuery: () => Promise<number>
): Promise<PermissionCheckResult> {
  const [permissions, currentCount] = await Promise.all([
    getOrganizationPermissions(orgId),
    countQuery(),
  ]);

  if (!permissions) {
    return {
      allowed: false,
      reason: 'Organization not found',
    };
  }

  const limit = permissions.limits[limitKey];

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      currentCount,
    };
  }

  const allowed = currentCount < limit;
  
  return {
    allowed,
    reason: allowed ? undefined : `Limit aşıldı: ${currentCount}/${limit}`,
    currentCount,
    limit,
    requiredPlan: allowed ? undefined : getNextPlanWithHigherLimit(permissions.plan, limitKey),
  };
}

/**
 * Require feature access - throws error if not allowed
 */
export async function requireFeature(orgId: string, feature: FeatureKey): Promise<void> {
  const hasAccess = await hasFeature(orgId, feature);
  
  if (!hasAccess) {
    const requiredPlan = getRequiredPlanForFeature(feature);
    throw new PermissionError(
      `Bu özellik ${PLANS[requiredPlan].name} planı gerektirir`,
      'FEATURE_NOT_AVAILABLE',
      { feature, requiredPlan }
    );
  }
}

/**
 * Require limit check - throws error if limit exceeded
 */
export async function requireLimit(
  orgId: string,
  limitKey: LimitKey,
  currentCount: number
): Promise<void> {
  const result = await checkLimit(orgId, limitKey, currentCount);

  if (!result.allowed) {
    throw new PermissionError(
      result.reason || 'Limit aşıldı',
      'LIMIT_EXCEEDED',
      { 
        limitKey, 
        currentCount: result.currentCount, 
        limit: result.limit,
        requiredPlan: result.requiredPlan,
      }
    );
  }
}

// ==========================================
// SPECIFIC LIMIT CHECKS
// ==========================================

/**
 * Check if organization can add more users
 */
export async function canAddUser(orgId: string): Promise<PermissionCheckResult> {
  const supabase = await createClient();

  return checkLimitWithCount(orgId, 'maxUsers', async () => {
    const { count } = await supabase
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active');
    return count || 0;
  });
}

/**
 * Check if organization can create more projects
 */
export async function canCreateProject(orgId: string): Promise<PermissionCheckResult> {
  const supabase = await createClient();

  return checkLimitWithCount(orgId, 'maxProjects', async () => {
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    return count || 0;
  });
}

/**
 * Check if organization can add more customers
 */
export async function canAddCustomer(orgId: string): Promise<PermissionCheckResult> {
  const supabase = await createClient();

  return checkLimitWithCount(orgId, 'maxCustomers', async () => {
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    return count || 0;
  });
}

/**
 * Check if organization can create more proposals
 */
export async function canCreateProposal(orgId: string): Promise<PermissionCheckResult> {
  const supabase = await createClient();

  return checkLimitWithCount(orgId, 'maxProposals', async () => {
    const { count } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);
    return count || 0;
  });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getNextPlanWithHigherLimit(currentPlan: PlanId, limitKey: LimitKey): PlanId {
  const planOrder: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const currentLimit = PLANS[currentPlan].limits[limitKey];

  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const plan = planOrder[i];
    const planLimit = PLANS[plan].limits[limitKey];
    if (planLimit === -1 || planLimit > currentLimit) {
      return plan;
    }
  }

  return 'enterprise';
}

function getRequiredPlanForFeature(feature: FeatureKey): PlanId {
  const planOrder: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];

  for (const plan of planOrder) {
    if (PLANS[plan].features[feature]) {
      return plan;
    }
  }

  return 'enterprise';
}

// ==========================================
// CUSTOM ERROR CLASS
// ==========================================

export class PermissionError extends Error {
  code: string;
  details: Record<string, any>;

  constructor(message: string, code: string, details: Record<string, any> = {}) {
    super(message);
    this.name = 'PermissionError';
    this.code = code;
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
 * Wrapper for server actions that require permission checks
 * Usage:
 * ```
 * export async function createProposal(orgId: string, data: any) {
 *   return withPermissionCheck(orgId, async () => {
 *     await requireLimit(orgId, 'maxProposals', currentCount);
 *     // ... create proposal logic
 *   });
 * }
 * ```
 */
export async function withPermissionCheck<T>(
  orgId: string,
  action: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string; code: string; details?: any }> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    if (error instanceof PermissionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      };
    }
    throw error; // Re-throw non-permission errors
  }
}

