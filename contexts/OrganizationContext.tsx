"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { PLANS, type PlanId, type PlanFeatures, type PlanLimits } from "@/config/subscriptions";

// Tipler
export interface OrganizationFeatures {
  smtp: boolean;
  removeBranding: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  advancedAnalytics: boolean;
}

export interface OrganizationLimits {
  maxOrganizations: number;
  maxUsers: number;
  maxProjects: number;
  maxCustomers: number;
  maxProposals: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  subscription_plan: PlanId;
  subscription_status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_price_id: string | null;
  billing_cycle: 'month' | 'year' | null;
  billing_currency: 'usd' | 'try';
  trial_ends_at: string | null;
  is_trial_used: boolean;
  features: OrganizationFeatures;
  usage_limits: OrganizationLimits;
  owner_id: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: string;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  userRole: OrgMember["role"] | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  // Plan helpers
  isFreePlan: boolean;
  isPaidPlan: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  hasFeature: (feature: keyof OrganizationFeatures) => boolean;
  getLimit: (limit: keyof OrganizationLimits) => number;
  checkLimit: (limit: keyof OrganizationLimits, currentCount: number) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrgMember["role"] | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Organizasyonları ve aktif org'u yükle
  const loadOrganizations = async () => {
    setIsLoading(true);

    try {
      // Önce session'ı kontrol et (daha güvenilir)
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      console.log("[OrgContext] Session check:", { 
        hasSession: !!session, 
        userId: user?.id 
      });
      
      if (!user) {
        console.log("[OrgContext] No user found, clearing state");
        setCurrentOrg(null);
        setOrganizations([]);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Kullanıcının üye olduğu organizasyonları çek
      const { data: memberships, error: memberError } = await supabase
        .from("org_members")
        .select(`
          role,
          status,
          organizations (
            id,
            name,
            slug,
            logo_url,
            subscription_plan,
            subscription_status,
            current_period_end,
            cancel_at_period_end,
            stripe_price_id,
            billing_cycle,
            billing_currency,
            trial_ends_at,
            is_trial_used,
            features,
            usage_limits,
            owner_id
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "pending"]);

      console.log("[OrgContext] Memberships query result:", { memberships, memberError });

      if (memberError) {
        console.error("[OrgContext] Org fetch error:", memberError);
        setIsLoading(false);
        return;
      }

      // Organizasyonları ayıkla
      const orgs = memberships
        ?.map((m: any) => m.organizations)
        .filter(Boolean) as Organization[];
      
      console.log("[OrgContext] Parsed organizations:", orgs);
      setOrganizations(orgs || []);

      // Profildeki aktif organizasyonu çek
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("current_organization_id")
        .eq("id", user.id)
        .single();

      console.log("[OrgContext] Profile:", { profile, profileError });

      // Aktif organizasyonu bul veya ilkini seç
      let activeOrg = orgs?.find(o => o.id === profile?.current_organization_id);
      
      if (!activeOrg && orgs?.length > 0) {
        activeOrg = orgs[0];
        console.log("[OrgContext] No active org in profile, selecting first:", activeOrg?.name);
        // Profili güncelle
        await supabase
          .from("profiles")
          .update({ current_organization_id: activeOrg.id })
          .eq("id", user.id);
      }

      if (activeOrg) {
        console.log("[OrgContext] Setting current org:", activeOrg.name);
        setCurrentOrg(activeOrg);
        
        // Kullanıcının bu org'daki rolünü bul
        const membership = memberships?.find(
          (m: any) => m.organizations?.id === activeOrg?.id
        );
        setUserRole(membership?.role || null);
      } else {
        console.log("[OrgContext] No organization found for user");
        setCurrentOrg(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error("[OrgContext] Organization load error:", error);
    }

    setIsLoading(false);
  };

  // Organizasyon değiştir
  const switchOrganization = async (orgId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Profili güncelle
    await supabase
      .from("profiles")
      .update({ current_organization_id: orgId })
      .eq("id", user.id);

    // State'i güncelle
    const newOrg = organizations.find(o => o.id === orgId);
    if (newOrg) {
      setCurrentOrg(newOrg);
      
      // Rolü güncelle
      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .single();
      
      setUserRole(membership?.role || null);
    }
  };

  // Organizasyonları yenile
  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Çift yüklemeyi önlemek için ref
  const initialLoadRef = useRef(false);

  useEffect(() => {
    // Auth değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[OrgContext] Auth state changed:", event, session?.user?.id);
      
      if (event === 'INITIAL_SESSION') {
        if (session && !initialLoadRef.current) {
          // Sayfa yüklendiğinde session varsa organizasyonları yükle (sadece bir kez)
          console.log("[OrgContext] Initial session found, loading organizations...");
          initialLoadRef.current = true;
          loadOrganizations();
        } else if (!session) {
          console.log("[OrgContext] No initial session");
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Login veya token yenilendiğinde organizasyonları yükle
        console.log("[OrgContext] User signed in, loading organizations...");
        loadOrganizations();
      } else if (event === 'SIGNED_OUT') {
        // Logout olduğunda state'i temizle
        console.log("[OrgContext] User signed out, clearing state");
        setCurrentOrg(null);
        setOrganizations([]);
        setUserRole(null);
        setIsLoading(false);
        initialLoadRef.current = false; // Reset for next login
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Memoized plan helpers
  const planHelpers = useMemo(() => {
    const plan = (currentOrg?.subscription_plan || 'free') as PlanId;
    const planConfig = PLANS[plan] || PLANS.free;
    const features = currentOrg?.features || planConfig.features;
    const limits = currentOrg?.usage_limits || planConfig.limits;

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    if (currentOrg?.trial_ends_at && currentOrg?.subscription_status === 'trialing') {
      const trialEnd = new Date(currentOrg.trial_ends_at);
      const now = new Date();
      trialDaysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return {
      isFreePlan: plan === 'free',
      isPaidPlan: plan !== 'free',
      isTrialing: currentOrg?.subscription_status === 'trialing',
      trialDaysRemaining,
      hasFeature: (feature: keyof OrganizationFeatures) => features[feature] ?? false,
      getLimit: (limit: keyof OrganizationLimits) => limits[limit] ?? 0,
      checkLimit: (limit: keyof OrganizationLimits, currentCount: number) => {
        const limitValue = limits[limit];
        if (limitValue === -1) return true; // Unlimited
        return currentCount < limitValue;
      },
    };
  }, [currentOrg?.subscription_plan, currentOrg?.features, currentOrg?.usage_limits, currentOrg?.trial_ends_at, currentOrg?.subscription_status]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        userRole,
        organizations,
        isLoading,
        switchOrganization,
        refreshOrganizations,
        ...planHelpers,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

// Custom hook
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

// Rol kontrol helper'ları
export function canManageMembers(role: OrgMember["role"] | null): boolean {
  return role === "owner" || role === "admin";
}

export function canEditData(role: OrgMember["role"] | null): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canDeleteData(role: OrgMember["role"] | null): boolean {
  return role === "owner" || role === "admin";
}

export function canViewOnly(role: OrgMember["role"] | null): boolean {
  return role === "viewer";
}

