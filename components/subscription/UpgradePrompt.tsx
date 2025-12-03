// components/subscription/UpgradePrompt.tsx
"use client";

import { useRouter } from "@/navigation";
import { 
  AlertTriangle, 
  Sparkles, 
  ArrowUpRight, 
  Lock,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getPlanDisplayName, type PlanType } from "@/utils/limits";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  requiredPlan: PlanType;
  currentLimit?: number;
  type?: 'limit' | 'feature';
}

export function UpgradePrompt({
  open,
  onClose,
  title,
  description,
  requiredPlan,
  currentLimit,
  type = 'limit',
}: UpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/settings/organization');
  };

  const Icon = type === 'limit' ? AlertTriangle : Lock;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-full ${
              type === 'limit' 
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {currentLimit !== undefined && (
                <Badge variant="secondary" className="mt-1">
                  Mevcut limit: {currentLimit}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {getPlanDisplayName(requiredPlan)} Plan
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {requiredPlan === 'starter' && 'Daha fazla müşteri ve proje için ideal başlangıç.'}
            {requiredPlan === 'pro' && 'Profesyonel özellikler ve öncelikli destek.'}
            {requiredPlan === 'enterprise' && 'Sınırsız kullanım ve özel çözümler.'}
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Daha Sonra
          </Button>
          <Button onClick={handleUpgrade} className="flex-1">
            <Zap className="mr-2 h-4 w-4" />
            Planı Yükselt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline banner version
interface UpgradeBannerProps {
  title: string;
  description?: string;
  requiredPlan: PlanType;
  compact?: boolean;
}

export function UpgradeBanner({
  title,
  description,
  requiredPlan,
  compact = false,
}: UpgradeBannerProps) {
  const router = useRouter();

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {title}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => router.push('/settings/organization')}
          className="h-7 text-xs"
        >
          <ArrowUpRight className="mr-1 h-3 w-3" />
          Yükselt
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-200">
              {title}
            </h4>
            {description && (
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {description}
              </p>
            )}
            <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {getPlanDisplayName(requiredPlan)} Plan Gerekli
            </Badge>
          </div>
        </div>
        <Button 
          onClick={() => router.push('/settings/organization')}
          className="shrink-0"
        >
          <Zap className="mr-2 h-4 w-4" />
          Yükselt
        </Button>
      </div>
    </div>
  );
}

// Feature gate component
interface FeatureGateProps {
  children: React.ReactNode;
  hasAccess: boolean;
  featureName: string;
  requiredPlan: PlanType;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  children,
  hasAccess,
  featureName,
  requiredPlan,
  fallback,
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradeBanner
      title={`${featureName} - ${getPlanDisplayName(requiredPlan)} Plan Gerekli`}
      requiredPlan={requiredPlan}
      compact
    />
  );
}

