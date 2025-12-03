// components/subscription/UsageMeter.tsx
"use client";

import { usePlanLimits, type LimitKey } from "@/hooks/usePlanLimits";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageMeterProps {
  currentCount: number;
  limitKey: LimitKey;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function UsageMeter({
  currentCount,
  limitKey,
  label,
  showPercentage = true,
  className,
}: UsageMeterProps) {
  const { getLimit, getLimitDisplay, getUsagePercentage } = usePlanLimits();
  
  const limit = getLimit(limitKey);
  const limitDisplay = getLimitDisplay(limitKey);
  const percentage = getUsagePercentage(currentCount, limitKey);
  
  // Renk belirleme
  const getColorClass = () => {
    if (limit === -1) return "bg-green-500"; // Sınırsız
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextColorClass = () => {
    if (limit === -1) return "text-green-600 dark:text-green-400";
    if (percentage >= 100) return "text-red-600 dark:text-red-400";
    if (percentage >= 80) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  const getStatusIcon = () => {
    if (limit === -1) return <Check className="h-4 w-4 text-green-500" />;
    if (percentage >= 100) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (percentage >= 80) return <TrendingUp className="h-4 w-4 text-amber-500" />;
    return null;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", getTextColorClass())}>
            {currentCount} / {limitDisplay}
          </span>
          {showPercentage && limit !== -1 && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", percentage >= 100 && "bg-red-100 text-red-700")}
            >
              {percentage}%
            </Badge>
          )}
        </div>
      </div>
      
      {limit !== -1 && (
        <Progress 
          value={Math.min(100, percentage)} 
          className="h-2"
          // indicatorClassName prop yoksa style ile yapmamız gerekebilir
        />
      )}
      
      {limit === -1 && (
        <div className="h-2 rounded-full bg-green-100 dark:bg-green-900/30">
          <div className="h-full rounded-full bg-green-500 w-full" />
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar or small spaces
interface UsageBadgeProps {
  currentCount: number;
  limitKey: LimitKey;
}

export function UsageBadge({ currentCount, limitKey }: UsageBadgeProps) {
  const { getLimit, getUsagePercentage } = usePlanLimits();
  
  const limit = getLimit(limitKey);
  const percentage = getUsagePercentage(currentCount, limitKey);
  
  if (limit === -1) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Sınırsız
      </Badge>
    );
  }

  const getBadgeColor = () => {
    if (percentage >= 100) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (percentage >= 80) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Badge variant="secondary" className={getBadgeColor()}>
      {currentCount}/{limit}
    </Badge>
  );
}

// Dashboard card for usage overview
interface UsageCardProps {
  title: string;
  currentCount: number;
  limitKey: LimitKey;
  icon?: React.ReactNode;
}

export function UsageCard({ title, currentCount, limitKey, icon }: UsageCardProps) {
  const { getLimit, getLimitDisplay, getUsagePercentage, getRemainingQuota } = usePlanLimits();
  
  const limit = getLimit(limitKey);
  const percentage = getUsagePercentage(currentCount, limitKey);
  const remaining = getRemainingQuota(currentCount, limitKey);

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <UsageBadge currentCount={currentCount} limitKey={limitKey} />
      </div>
      
      <UsageMeter 
        currentCount={currentCount} 
        limitKey={limitKey} 
        showPercentage={false}
      />
      
      {limit !== -1 && remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {remaining} adet daha ekleyebilirsiniz
        </p>
      )}
      
      {limit !== -1 && remaining === 0 && (
        <p className="text-xs text-red-500 mt-2">
          Limit doldu. Planınızı yükseltin.
        </p>
      )}
    </div>
  );
}

