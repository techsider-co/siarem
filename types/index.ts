// =============================================
// ORGANIZATION & MULTI-TENANCY TYPES
// =============================================

export type UserRole = "owner" | "admin" | "member" | "viewer";
export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";
export type MemberStatus = "pending" | "active" | "deactivated";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  owner_id: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  invited_at: string;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
  
  // Joined data
  organization?: Organization;
  user?: UserProfile;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  current_organization_id: string | null;
  
  // Firma bilgileri (kişisel workspace için)
  company_name: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  
  // Varsayılan ayarlar
  default_valid_days: number;
  default_currency: string;
  
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

// =============================================
// BUSINESS ENTITY TYPES
// =============================================

export interface Customer {
  id: string;
  organization_id: string; // Multi-tenancy için eklendi
  created_at: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_office: string | null;
  tax_number: string | null;
  sector_code: string | null;
  logo_url: string | null;
  city: string | null;
  district: string | null;
  is_archived: boolean;
}

export interface Proposal {
  id: string;
  organization_id: string;
  customer_id: string;
  proposal_no: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "completed";
  total_amount: number;
  currency: string;
  valid_until: string | null;
  access_key: string;
  content: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  
  // Joined data
  customer?: Customer;
}

export interface Contract {
  id: string;
  organization_id: string;
  proposal_id: string | null;
  customer_id: string;
  contract_no: string;
  status: "draft" | "active" | "completed" | "cancelled";
  content: Record<string, any>;
  signed_at: string | null;
  access_key: string;
  created_at: string;
  is_archived: boolean;
  
  // Joined data
  customer?: Customer;
  proposal?: Proposal;
}

export interface Project {
  id: string;
  organization_id: string;
  customer_id: string | null;
  proposal_id: string | null;
  name: string;
  description: string | null;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  created_at: string;
  is_archived: boolean;
  
  // Joined data
  customer?: Customer;
  tasks?: Task[];
}

export interface Task {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string;
  is_archived: boolean;
}

export interface Transaction {
  id: string;
  organization_id: string;
  proposal_id: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  created_at: string;
}

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string;
  is_active: boolean;
  created_at: string;
}

// =============================================
// PERMISSION HELPERS
// =============================================

export const ROLE_PERMISSIONS = {
  owner: {
    canManageOrg: true,
    canManageMembers: true,
    canManageBilling: true,
    canDeleteOrg: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canView: true,
  },
  admin: {
    canManageOrg: true,
    canManageMembers: true,
    canManageBilling: false,
    canDeleteOrg: false,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canView: true,
  },
  member: {
    canManageOrg: false,
    canManageMembers: false,
    canManageBilling: false,
    canDeleteOrg: false,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canView: true,
  },
  viewer: {
    canManageOrg: false,
    canManageMembers: false,
    canManageBilling: false,
    canDeleteOrg: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canView: true,
  },
} as const;

export function hasPermission(
  role: UserRole | null,
  permission: keyof typeof ROLE_PERMISSIONS.owner
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role][permission];
}