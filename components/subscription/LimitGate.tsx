// components/subscription/LimitGate.tsx
"use client";

import { useState } from "react";
import { useOrganization, type OrganizationLimits } from "@/contexts/OrganizationContext";
import { UpgradePrompt } from "./UpgradePrompt";
import { PLANS, type PlanId } from "@/config/subscriptions";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LimitGateProps {
  children: React.ReactNode;
  limitKey: keyof OrganizationLimits;
  currentCount: number;
  onLimitExceeded?: () => void;
}

/**
 * Wraps a component and shows upgrade prompt if limit is exceeded
 */
export function LimitGate({
  children,
  limitKey,
  currentCount,
  onLimitExceeded,
}: LimitGateProps) {
  const { checkLimit, getLimit, currentOrg } = useOrganization();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const limit = getLimit(limitKey);
  const isWithinLimit = checkLimit(limitKey, currentCount);
  const plan = (currentOrg?.subscription_plan || 'free') as PlanId;

  // Find required plan for higher limit
  const requiredPlan = getRequiredPlanForLimit(plan, limitKey);

  const handleClick = (e: React.MouseEvent) => {
    if (!isWithinLimit) {
      e.preventDefault();
      e.stopPropagation();
      setShowUpgrade(true);
      onLimitExceeded?.();
    }
  };

  if (!isWithinLimit) {
    return (
      <>
        <div onClick={handleClick} className="cursor-not-allowed">
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </div>
        <UpgradePrompt
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          title={getLimitTitle(limitKey)}
          description={getLimitDescription(limitKey, currentCount, limit)}
          requiredPlan={requiredPlan}
          currentLimit={limit}
          type="limit"
        />
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Shows warning when approaching limit
 */
interface LimitWarningProps {
  limitKey: keyof OrganizationLimits;
  currentCount: number;
  warningThreshold?: number; // Percentage (default 80%)
}

export function LimitWarning({
  limitKey,
  currentCount,
  warningThreshold = 80,
}: LimitWarningProps) {
  const { getLimit, currentOrg } = useOrganization();
  const limit = getLimit(limitKey);

  // No warning for unlimited
  if (limit === -1) return null;

  const percentage = Math.round((currentCount / limit) * 100);
  
  if (percentage < warningThreshold) return null;

  const isExceeded = currentCount >= limit;
  const plan = (currentOrg?.subscription_plan || 'free') as PlanId;
  const requiredPlan = getRequiredPlanForLimit(plan, limitKey);

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${
      isExceeded 
        ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' 
        : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
    }`}>
      <AlertTriangle className={`h-4 w-4 ${isExceeded ? 'text-red-500' : 'text-amber-500'}`} />
      <span className={`text-sm ${isExceeded ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
        {isExceeded 
          ? `${getLimitName(limitKey)} limitine ulaştınız (${currentCount}/${limit})`
          : `${getLimitName(limitKey)} limitinin %${percentage}'ına ulaştınız`
        }
      </span>
      <Badge variant="secondary" className="ml-auto">
        {PLANS[requiredPlan].name}'e yükselt
      </Badge>
    </div>
  );
}

/**
 * Inline limit indicator
 */
interface LimitIndicatorProps {
  limitKey: keyof OrganizationLimits;
  currentCount: number;
  showLabel?: boolean;
}

export function LimitIndicator({
  limitKey,
  currentCount,
  showLabel = true,
}: LimitIndicatorProps) {
  const { getLimit } = useOrganization();
  const limit = getLimit(limitKey);

  const isUnlimited = limit === -1;
  const isExceeded = !isUnlimited && currentCount >= limit;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((currentCount / limit) * 100));

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm text-muted-foreground">{getLimitName(limitKey)}:</span>
      )}
      <span className={`text-sm font-medium ${isExceeded ? 'text-red-500' : ''}`}>
        {currentCount}/{isUnlimited ? '∞' : limit}
      </span>
      {!isUnlimited && (
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isExceeded ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Button that checks limit before action
 */
interface LimitedButtonProps extends React.ComponentProps<typeof Button> {
  limitKey: keyof OrganizationLimits;
  currentCount: number;
  onAction: () => void;
}

export function LimitedButton({
  limitKey,
  currentCount,
  onAction,
  children,
  ...props
}: LimitedButtonProps) {
  const { checkLimit, getLimit, currentOrg } = useOrganization();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isWithinLimit = checkLimit(limitKey, currentCount);
  const limit = getLimit(limitKey);
  const plan = (currentOrg?.subscription_plan || 'free') as PlanId;
  const requiredPlan = getRequiredPlanForLimit(plan, limitKey);

  const handleClick = () => {
    if (isWithinLimit) {
      onAction();
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <>
      <Button 
        {...props} 
        onClick={handleClick}
      >
        {!isWithinLimit && <Lock className="h-4 w-4 mr-2" />}
        {children}
      </Button>
      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title={getLimitTitle(limitKey)}
        description={getLimitDescription(limitKey, currentCount, limit)}
        requiredPlan={requiredPlan}
        currentLimit={limit}
        type="limit"
      />
    </>
  );
}

// ==========================================
// HELPERS
// ==========================================

function getRequiredPlanForLimit(currentPlan: PlanId, limitKey: keyof OrganizationLimits): PlanId {
  const currentLimit = PLANS[currentPlan].limits[limitKey];
  const planOrder: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);

  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const plan = planOrder[i];
    const planLimit = PLANS[plan].limits[limitKey];
    if (planLimit === -1 || planLimit > currentLimit) {
      return plan;
    }
  }

  return 'enterprise';
}

function getLimitName(limitKey: keyof OrganizationLimits): string {
  const names: Record<keyof OrganizationLimits, string> = {
    maxUsers: 'Kullanıcı',
    maxProjects: 'Proje',
    maxCustomers: 'Müşteri',
    maxProposals: 'Teklif',
  };
  return names[limitKey];
}

function getLimitTitle(limitKey: keyof OrganizationLimits): string {
  return `${getLimitName(limitKey)} Limitine Ulaşıldı`;
}

function getLimitDescription(
  limitKey: keyof OrganizationLimits, 
  currentCount: number, 
  limit: number
): string {
  const name = getLimitName(limitKey).toLowerCase();
  return `Mevcut planınızda maksimum ${limit} ${name} ekleyebilirsiniz. Şu anda ${currentCount} ${name} mevcut. Daha fazla ${name} eklemek için planınızı yükseltin.`;
}

