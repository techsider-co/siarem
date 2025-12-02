"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";

// Tipler
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  subscription_plan: string;
  subscription_status: string;
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
      // NOT: "pending" status'ları da dahil et (davet bekleyenler hariç aktif kullanıcılar)
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
            owner_id
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "pending"]); // pending'i de dahil et

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

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        userRole,
        organizations,
        isLoading,
        switchOrganization,
        refreshOrganizations,
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

