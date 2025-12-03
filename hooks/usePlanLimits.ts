// hooks/usePlanLimits.ts
"use client";

import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  checkLimit, 
  getLimit, 
  getAllLimits,
  getRemainingQuota,
  getLimitUsagePercentage,
  hasFeature, 
  getAllFeatures,
  needsUpgrade,
  getLimitExceededPrompt,
  getFeatureUpgradePrompt,
  getPlanDisplayName,
  formatLimitValue,
  normalizePlanName,
  type LimitKey,
  type FeatureKey,
  type PlanType,
} from '@/utils/limits';

export interface UsePlanLimitsReturn {
  // Plan bilgisi
  currentPlan: PlanType;
  planDisplayName: string;
  isFreePlan: boolean;
  isPaidPlan: boolean;
  
  // Limit kontrolleri
  checkLimit: (currentCount: number, limitKey: LimitKey) => boolean;
  getLimit: (limitKey: LimitKey) => number;
  getLimitDisplay: (limitKey: LimitKey) => string;
  getAllLimits: () => Record<LimitKey, number>;
  getRemainingQuota: (currentCount: number, limitKey: LimitKey) => number;
  getUsagePercentage: (currentCount: number, limitKey: LimitKey) => number;
  
  // Özellik kontrolleri
  hasFeature: (featureKey: FeatureKey) => boolean;
  getAllFeatures: () => Record<FeatureKey, boolean>;
  
  // Upgrade kontrolleri
  needsUpgrade: (requiredPlan: PlanType) => boolean;
  getLimitExceededPrompt: (limitKey: LimitKey) => ReturnType<typeof getLimitExceededPrompt>;
  getFeatureUpgradePrompt: (featureKey: FeatureKey) => ReturnType<typeof getFeatureUpgradePrompt>;
  
  // Loading state
  isLoading: boolean;
}

/**
 * Plan limitleri ve özelliklerini yöneten custom hook
 * @example
 * const { checkLimit, hasFeature, needsUpgrade } = usePlanLimits();
 * 
 * // Limit kontrolü
 * if (!checkLimit(currentCustomerCount, 'maxCustomers')) {
 *   showUpgradeModal(getLimitExceededPrompt('maxCustomers'));
 * }
 * 
 * // Özellik kontrolü
 * if (hasFeature('apiAccess')) {
 *   // API özelliklerini göster
 * }
 */
export function usePlanLimits(): UsePlanLimitsReturn {
  const { currentOrg, isLoading } = useOrganization();
  
  const currentPlan = useMemo(() => {
    return normalizePlanName(currentOrg?.subscription_plan);
  }, [currentOrg?.subscription_plan]);
  
  const planDisplayName = useMemo(() => {
    return getPlanDisplayName(currentPlan);
  }, [currentPlan]);
  
  return useMemo(() => ({
    // Plan bilgisi
    currentPlan,
    planDisplayName,
    isFreePlan: currentPlan === 'free',
    isPaidPlan: currentPlan !== 'free',
    
    // Limit kontrolleri
    checkLimit: (currentCount: number, limitKey: LimitKey) => 
      checkLimit(currentPlan, currentCount, limitKey),
    
    getLimit: (limitKey: LimitKey) => 
      getLimit(currentPlan, limitKey),
    
    getLimitDisplay: (limitKey: LimitKey) => 
      formatLimitValue(getLimit(currentPlan, limitKey)),
    
    getAllLimits: () => 
      getAllLimits(currentPlan),
    
    getRemainingQuota: (currentCount: number, limitKey: LimitKey) => 
      getRemainingQuota(currentPlan, currentCount, limitKey),
    
    getUsagePercentage: (currentCount: number, limitKey: LimitKey) => 
      getLimitUsagePercentage(currentPlan, currentCount, limitKey),
    
    // Özellik kontrolleri
    hasFeature: (featureKey: FeatureKey) => 
      hasFeature(currentPlan, featureKey),
    
    getAllFeatures: () => 
      getAllFeatures(currentPlan),
    
    // Upgrade kontrolleri
    needsUpgrade: (requiredPlan: PlanType) => 
      needsUpgrade(currentPlan, requiredPlan),
    
    getLimitExceededPrompt: (limitKey: LimitKey) => 
      getLimitExceededPrompt(limitKey, currentPlan),
    
    getFeatureUpgradePrompt: (featureKey: FeatureKey) => 
      getFeatureUpgradePrompt(featureKey),
    
    // Loading state
    isLoading,
  }), [currentPlan, planDisplayName, isLoading]);
}

// Re-export types for convenience
export type { LimitKey, FeatureKey, PlanType };

