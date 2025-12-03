// hooks/useDynamicLimits.ts
// Client-side hook for checking limits from database (synced from Stripe)
"use client";

import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

// ==========================================
// TYPES (matching server-side)
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

interface UsageLimits {
  max_users: number;
  max_org: number;
  max_projects: number;
  max_customers: number;
  max_proposals: number;
}

interface Features {
  can_remove_branding: boolean;
  smtp: boolean;
  api_usage: boolean;
  advanced_reporting: boolean;
  primary_support: boolean;
  white_label: boolean;
  custom_domain: boolean;
}

// Default Free Plan values
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
// HOOK
// ==========================================

export interface UseDynamicLimitsReturn {
  // Loading state
  isLoading: boolean;
  
  // Plan info
  plan: string;
  
  // Limit getters
  getLimit: (limitType: LimitType) => number;
  checkLimit: (limitType: LimitType, currentCount: number) => boolean;
  getRemainingQuota: (limitType: LimitType, currentCount: number) => number;
  isUnlimited: (limitType: LimitType) => boolean;
  
  // Feature getters
  hasFeature: (featureType: FeatureType) => boolean;
  
  // Raw data
  limits: UsageLimits;
  features: Features;
  
  // Display helpers
  getLimitDisplay: (limitType: LimitType) => string;
  getFeatureDisplay: (featureType: FeatureType) => string;
}

/**
 * Hook to check dynamic limits from database (synced from Stripe)
 * This reads the cached usage_limits and features from the organization
 */
export function useDynamicLimits(): UseDynamicLimitsReturn {
  const { currentOrg, isLoading } = useOrganization();

  const limits = useMemo((): UsageLimits => {
    if (!currentOrg?.usage_limits) {
      return FREE_PLAN_LIMITS;
    }

    // Handle both snake_case from DB and potentially camelCase
    const rawLimits = currentOrg.usage_limits as any;
    
    return {
      max_users: rawLimits.max_users ?? rawLimits.maxUsers ?? FREE_PLAN_LIMITS.max_users,
      max_org: rawLimits.max_org ?? rawLimits.maxOrg ?? rawLimits.maxOrganizations ?? FREE_PLAN_LIMITS.max_org,
      max_projects: rawLimits.max_projects ?? rawLimits.maxProjects ?? FREE_PLAN_LIMITS.max_projects,
      max_customers: rawLimits.max_customers ?? rawLimits.maxCustomers ?? FREE_PLAN_LIMITS.max_customers,
      max_proposals: rawLimits.max_proposals ?? rawLimits.maxProposals ?? FREE_PLAN_LIMITS.max_proposals,
    };
  }, [currentOrg?.usage_limits]);

  const features = useMemo((): Features => {
    if (!currentOrg?.features) {
      return FREE_PLAN_FEATURES;
    }

    const rawFeatures = currentOrg.features as any;

    return {
      can_remove_branding: parseBool(rawFeatures.can_remove_branding ?? rawFeatures.removeBranding),
      smtp: parseBool(rawFeatures.smtp),
      api_usage: parseBool(rawFeatures.api_usage ?? rawFeatures.apiAccess),
      advanced_reporting: parseBool(rawFeatures.advanced_reporting ?? rawFeatures.advancedAnalytics),
      primary_support: parseBool(rawFeatures.primary_support ?? rawFeatures.prioritySupport),
      white_label: parseBool(rawFeatures.white_label ?? rawFeatures.whiteLabel),
      custom_domain: parseBool(rawFeatures.custom_domain ?? rawFeatures.customDomain),
    };
  }, [currentOrg?.features]);

  const plan = currentOrg?.subscription_plan || 'free';

  return useMemo(() => ({
    isLoading,
    plan,
    limits,
    features,

    getLimit: (limitType: LimitType) => limits[limitType],

    checkLimit: (limitType: LimitType, currentCount: number) => {
      const limit = limits[limitType];
      if (limit === -1) return true; // Unlimited
      return currentCount < limit;
    },

    getRemainingQuota: (limitType: LimitType, currentCount: number) => {
      const limit = limits[limitType];
      if (limit === -1) return Infinity;
      return Math.max(0, limit - currentCount);
    },

    isUnlimited: (limitType: LimitType) => limits[limitType] === -1,

    hasFeature: (featureType: FeatureType) => features[featureType],

    getLimitDisplay: (limitType: LimitType) => {
      const limit = limits[limitType];
      if (limit === -1) return 'Sınırsız';
      return limit.toString();
    },

    getFeatureDisplay: (featureType: FeatureType) => {
      return features[featureType] ? 'Aktif' : 'Yok';
    },
  }), [isLoading, plan, limits, features]);
}

// Helper to parse boolean from various formats
function parseBool(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return false;
}

// ==========================================
// DISPLAY NAMES
// ==========================================

export const LIMIT_DISPLAY_NAMES: Record<LimitType, string> = {
  max_users: 'Kullanıcı',
  max_org: 'Organizasyon',
  max_projects: 'Proje',
  max_customers: 'Müşteri',
  max_proposals: 'Teklif',
};

export const FEATURE_DISPLAY_NAMES: Record<FeatureType, string> = {
  can_remove_branding: 'Marka Kaldırma',
  smtp: 'SMTP Entegrasyonu',
  api_usage: 'API Erişimi',
  advanced_reporting: 'Gelişmiş Raporlama',
  primary_support: 'Öncelikli Destek',
  white_label: 'White Label',
  custom_domain: 'Özel Alan Adı',
};

