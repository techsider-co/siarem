// app/[locale]/actions/resource-actions.ts
// Example Server Actions with dynamic limit checking
"use server";

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { 
  checkDynamicLimit, 
  requireLimit, 
  requireFeature,
  withLimitCheck,
  LimitExceededError,
  FeatureNotAvailableError,
} from '@/utils/check-limits';

// ==========================================
// TYPES
// ==========================================

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

// ==========================================
// CREATE CUSTOMER (with limit check)
// ==========================================

interface CreateCustomerInput {
  organizationId: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // ⭐ Check limit before creating
    await requireLimit(input.organizationId, 'max_customers');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Oturum açmanız gerekiyor', code: 'AUTH_REQUIRED' };
    }

    // Create customer
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        organization_id: input.organizationId,
        company_name: input.companyName,
        contact_person: input.contactPerson,
        email: input.email,
        phone: input.phone,
        address: input.address,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[createCustomer] Error:', error);
      return { success: false, error: error.message, code: 'DB_ERROR' };
    }

    revalidatePath('/customers');
    return { success: true, data: customer };

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

// ==========================================
// CREATE PROJECT (with limit check)
// ==========================================

interface CreateProjectInput {
  organizationId: string;
  name: string;
  customerId?: string;
  description?: string;
}

export async function createProject(input: CreateProjectInput): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // ⭐ Check limit before creating
    await requireLimit(input.organizationId, 'max_projects');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Oturum açmanız gerekiyor', code: 'AUTH_REQUIRED' };
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        customer_id: input.customerId,
        user_id: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: 'DB_ERROR' };
    }

    revalidatePath('/projects');
    return { success: true, data: project };

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

// ==========================================
// CREATE PROPOSAL (with limit check)
// ==========================================

interface CreateProposalInput {
  organizationId: string;
  customerId: string;
  title?: string;
  validUntil?: string;
}

export async function createProposal(input: CreateProposalInput): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // ⭐ Check limit before creating
    await requireLimit(input.organizationId, 'max_proposals');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Oturum açmanız gerekiyor', code: 'AUTH_REQUIRED' };
    }

    // Generate proposal number
    const { count } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId);

    const proposalNo = `TKF-${String((count || 0) + 1).padStart(5, '0')}`;

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert({
        organization_id: input.organizationId,
        customer_id: input.customerId,
        proposal_no: proposalNo,
        status: 'draft',
        valid_until: input.validUntil,
        user_id: user.id,
        access_key: crypto.randomUUID(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: 'DB_ERROR' };
    }

    revalidatePath('/proposals');
    return { success: true, data: proposal };

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

// ==========================================
// INVITE USER (with limit check)
// ==========================================

interface InviteUserInput {
  organizationId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export async function inviteUser(input: InviteUserInput): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // ⭐ Check user limit before inviting
    await requireLimit(input.organizationId, 'max_users');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Oturum açmanız gerekiyor', code: 'AUTH_REQUIRED' };
    }

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', input.email.toLowerCase())
      .maybeSingle();

    // Check if already a member
    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from('org_members')
        .select('id')
        .eq('organization_id', input.organizationId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return { 
          success: false, 
          error: 'Bu kullanıcı zaten organizasyonda', 
          code: 'ALREADY_MEMBER' 
        };
      }
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('org_members')
      .insert({
        organization_id: input.organizationId,
        user_id: existingProfile?.id || null,
        invited_email: input.email.toLowerCase(),
        role: input.role,
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: 'DB_ERROR' };
    }

    revalidatePath('/settings/team');
    return { success: true, data: invitation };

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

// ==========================================
// USING withLimitCheck WRAPPER (alternative pattern)
// ==========================================

export async function createCustomerV2(input: CreateCustomerInput): Promise<ActionResult> {
  const supabase = await createClient();

  return withLimitCheck(input.organizationId, 'max_customers', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum açmanız gerekiyor');

    const { data, error } = await supabase
      .from('customers')
      .insert({
        organization_id: input.organizationId,
        company_name: input.companyName,
        contact_person: input.contactPerson,
        email: input.email,
        phone: input.phone,
        address: input.address,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/customers');
    return data;
  });
}

// ==========================================
// FEATURE-GATED ACTION EXAMPLE
// ==========================================

interface SendEmailInput {
  organizationId: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendCustomEmail(input: SendEmailInput): Promise<ActionResult> {
  try {
    // ⭐ Check if SMTP feature is available
    await requireFeature(input.organizationId, 'smtp');

    // Send email logic here...
    console.log('[sendCustomEmail] SMTP feature available, sending email...');

    return { success: true, data: { sent: true } };

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

// ==========================================
// CHECK LIMITS ACTION (for UI)
// ==========================================

export async function checkResourceLimits(organizationId: string) {
  const [customers, projects, proposals, users] = await Promise.all([
    checkDynamicLimit(organizationId, 'max_customers'),
    checkDynamicLimit(organizationId, 'max_projects'),
    checkDynamicLimit(organizationId, 'max_proposals'),
    checkDynamicLimit(organizationId, 'max_users'),
  ]);

  return {
    customers,
    projects,
    proposals,
    users,
  };
}

