// app/api/stripe/webhook/route.ts
// Stripe Metadata is the Source of Truth for limits and features
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/utils/supabase/admin';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ==========================================
// TYPES
// ==========================================

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

// Default Free Plan limits and features
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
// WEBHOOK HANDLER
// ==========================================

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('[Webhook] No signature found');
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[Webhook] Event received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing event: ${error.message}`);
    console.error(error.stack);
    return NextResponse.json(
      { error: `Webhook handler error: ${error.message}` },
      { status: 500 }
    );
  }
}

// ==========================================
// EVENT HANDLERS
// ==========================================

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const orgId = session.metadata?.organization_id;
  const userId = session.metadata?.user_id;

  console.log(`[Checkout Completed] Org: ${orgId}, Session: ${session.id}`);

  if (!orgId || !session.subscription) {
    console.error('[Checkout] Missing organization_id or subscription');
    return;
  }

  // ⭐ IMPORTANT: Expand product to get metadata
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ['items.data.price.product'] }
  ) as any; // Type assertion for flexibility

  const priceItem = subscription.items.data[0];
  const priceId = priceItem?.price.id;
  const product = priceItem?.price.product as Stripe.Product;

  // ⭐ Extract limits and features from Stripe Product Metadata
  const { usageLimits, features, planId } = extractMetadataFromProduct(product);

  console.log(`[Checkout] Plan: ${planId}, Limits:`, usageLimits);

  // Update organization with metadata from Stripe
  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      subscription_plan: planId,
      subscription_status: subscription.status,
      billing_cycle: subscription.items.data[0]?.price.recurring?.interval || null,
      current_period_end: safeTimestamp(subscription.current_period_end),
      trial_ends_at: subscription.trial_end ? safeTimestamp(subscription.trial_end) : null,
      is_trial_used: true,
      payment_status: 'succeeded',
      cancel_at_period_end: false,
      // ⭐ Store Stripe metadata as source of truth
      usage_limits: usageLimits,
      features: features,
    })
    .eq('id', orgId);

  if (updateError) {
    console.error('[Checkout] DB Update Error:', updateError);
    throw updateError;
  }

  // Log subscription event
  await logSubscriptionEvent({
    organization_id: orgId,
    event_type: 'checkout_completed',
    stripe_event_id: event.id,
    new_plan: planId,
    new_status: subscription.status,
    metadata: {
      session_id: session.id,
      user_id: userId,
      amount: priceItem?.price.unit_amount,
      currency: subscription.currency,
      limits: usageLimits,
    },
  });

  console.log(`[Checkout] Organization ${orgId} updated with Stripe metadata`);
}

async function handleSubscriptionChange(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log(`[Subscription Change] Sub: ${subscription.id}, Status: ${subscription.status}`);

  // Find organization
  const orgId = await findOrganizationBySubscription(subscription);
  if (!orgId) {
    console.error('[Subscription Change] Organization not found');
    return;
  }

  // Get previous state
  const { data: currentOrg } = await supabaseAdmin
    .from('organizations')
    .select('subscription_plan, subscription_status')
    .eq('id', orgId)
    .single();

  // ⭐ Retrieve with expanded product for metadata
  const fullSubscription = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ['items.data.price.product'],
  }) as any; // Type assertion for flexibility

  const priceItem = fullSubscription.items.data[0];
  const priceId = priceItem?.price.id;
  const product = priceItem?.price.product as Stripe.Product;

  // ⭐ Extract limits and features from Stripe Product Metadata
  const { usageLimits, features, planId } = extractMetadataFromProduct(product);

  console.log(`[Subscription Change] Plan: ${planId}, Limits:`, usageLimits);

  // Update organization
  await supabaseAdmin
    .from('organizations')
    .update({
      stripe_price_id: priceId,
      subscription_plan: planId,
      subscription_status: fullSubscription.status,
      billing_cycle: priceItem?.price.recurring?.interval || null,
      current_period_end: safeTimestamp(fullSubscription.current_period_end),
      cancel_at_period_end: fullSubscription.cancel_at_period_end,
      trial_ends_at: fullSubscription.trial_end ? safeTimestamp(fullSubscription.trial_end) : null,
      // ⭐ Update with latest Stripe metadata
      usage_limits: usageLimits,
      features: features,
    })
    .eq('id', orgId);

  // Determine event type
  let eventType = 'updated';
  if (currentOrg?.subscription_plan && planId !== currentOrg.subscription_plan) {
    eventType = comparePlanLevel(planId, currentOrg.subscription_plan) > 0 ? 'upgraded' : 'downgraded';
  }

  // Log event
  await logSubscriptionEvent({
    organization_id: orgId,
    event_type: eventType,
    stripe_event_id: event.id,
    previous_plan: currentOrg?.subscription_plan,
    new_plan: planId,
    previous_status: currentOrg?.subscription_status,
    new_status: fullSubscription.status,
    metadata: {
      cancel_at_period_end: fullSubscription.cancel_at_period_end,
      limits: usageLimits,
    },
  });

  console.log(`[Subscription Change] Org ${orgId} - ${eventType} to ${planId}`);
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log(`[Subscription Deleted] Sub: ${subscription.id}`);

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, subscription_plan')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!org) {
    console.error('[Subscription Deleted] Organization not found');
    return;
  }

  // ⭐ Reset to Free Plan limits and features
  await supabaseAdmin
    .from('organizations')
    .update({
      subscription_plan: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      billing_cycle: null,
      cancel_at_period_end: false,
      // ⭐ Reset to free plan metadata
      usage_limits: FREE_PLAN_LIMITS,
      features: FREE_PLAN_FEATURES,
    })
    .eq('id', org.id);

  await logSubscriptionEvent({
    organization_id: org.id,
    event_type: 'canceled',
    stripe_event_id: event.id,
    previous_plan: org.subscription_plan,
    new_plan: 'free',
    new_status: 'canceled',
  });

  console.log(`[Subscription Deleted] Org ${org.id} reverted to free plan`);
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as any; // Stripe.Invoice

  console.log(`[Invoice Paid] Invoice: ${invoice.id}, Amount: ${invoice.amount_paid}`);

  let orgId: string | undefined;

  if (invoice.subscription) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single();
    orgId = org?.id;
  }

  if (!orgId && invoice.customer) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', invoice.customer as string)
      .single();
    orgId = org?.id;
  }

  if (!orgId) {
    console.log('[Invoice Paid] Organization not found, skipping');
    return;
  }

  await supabaseAdmin
    .from('organizations')
    .update({ payment_status: 'succeeded' })
    .eq('id', orgId);

  const invoiceData: Record<string, any> = {
    organization_id: orgId,
    stripe_invoice_id: invoice.id,
    stripe_invoice_number: invoice.number,
    stripe_hosted_invoice_url: invoice.hosted_invoice_url,
    stripe_invoice_pdf: invoice.invoice_pdf,
    amount_due: invoice.amount_due || 0,
    amount_paid: invoice.amount_paid || 0,
    currency: invoice.currency || 'usd',
    status: invoice.status || 'paid',
    paid_at: new Date().toISOString(),
    plan_name: invoice.lines?.data?.[0]?.description || 'Abonelik',
  };

  if (invoice.period_start) {
    invoiceData.period_start = safeTimestamp(invoice.period_start);
  }
  if (invoice.period_end) {
    invoiceData.period_end = safeTimestamp(invoice.period_end);
  }

  await supabaseAdmin.from('invoices').upsert(invoiceData, {
    onConflict: 'stripe_invoice_id',
  });

  console.log(`[Invoice Paid] Saved invoice ${invoice.id} for org ${orgId}`);
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as any; // Stripe.Invoice

  console.log(`[Invoice Failed] Invoice: ${invoice.id}`);

  if (!invoice.subscription) return;

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', invoice.subscription as string)
    .single();

  if (!org) return;

  await supabaseAdmin
    .from('organizations')
    .update({
      payment_status: 'failed',
      subscription_status: 'past_due',
    })
    .eq('id', org.id);

  await logSubscriptionEvent({
    organization_id: org.id,
    event_type: 'payment_failed',
    stripe_event_id: event.id,
    new_status: 'past_due',
    metadata: {
      invoice_id: invoice.id,
      amount: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  console.log(`[Invoice Failed] Org ${org.id} marked as past_due`);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * ⭐ Extract limits and features from Stripe Product Metadata
 * This is the core function that makes Stripe the source of truth
 */
function extractMetadataFromProduct(product: Stripe.Product | undefined): {
  usageLimits: UsageLimits;
  features: Features;
  planId: string;
} {
  if (!product?.metadata) {
    console.warn('[extractMetadata] No product or metadata, using free plan defaults');
    return {
      usageLimits: FREE_PLAN_LIMITS,
      features: FREE_PLAN_FEATURES,
      planId: 'free',
    };
  }

  const meta = product.metadata;

  // Parse usage limits from metadata
  const usageLimits: UsageLimits = {
    max_users: parseMetadataInt(meta.max_users, FREE_PLAN_LIMITS.max_users),
    max_org: parseMetadataInt(meta.max_org, FREE_PLAN_LIMITS.max_org),
    max_projects: parseMetadataInt(meta.max_projects, FREE_PLAN_LIMITS.max_projects),
    max_customers: parseMetadataInt(meta.max_customers || meta.max_customer, FREE_PLAN_LIMITS.max_customers),
    max_proposals: parseMetadataInt(meta.max_proposals, FREE_PLAN_LIMITS.max_proposals),
  };

  // Parse features from metadata
  const features: Features = {
    can_remove_branding: parseMetadataBool(meta.can_remove_branding),
    smtp: parseMetadataBool(meta.smtp),
    api_usage: parseMetadataBool(meta.api_usage),
    advanced_reporting: parseMetadataBool(meta.advanced_reporting),
    primary_support: parseMetadataBool(meta.primary_support),
    white_label: parseMetadataBool(meta.white_label),
    custom_domain: parseMetadataBool(meta.custom_domain),
  };

  // Determine plan ID from product name
  let planId = 'starter';
  const productName = product.name.toLowerCase();

  if (productName.includes('enterprise') || productName.includes('kurumsal')) {
    planId = 'enterprise';
  } else if (productName.includes('pro') || productName.includes('profesyonel')) {
    planId = 'pro';
  } else if (productName.includes('starter') || productName.includes('başlangıç')) {
    planId = 'starter';
  }

  // Override with metadata plan_id if exists
  if (meta.plan_id) {
    planId = meta.plan_id;
  }

  console.log(`[extractMetadata] Product: ${product.name}`, { usageLimits, features, planId });

  return { usageLimits, features, planId };
}

/**
 * Parse integer from metadata string, supporting -1 for unlimited
 */
function parseMetadataInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean from metadata string
 */
function parseMetadataBool(value: string | undefined): boolean {
  if (!value) return false;
  return value === 'true' || value === '1';
}

function safeTimestamp(timestamp: number | null | undefined): string | null {
  if (!timestamp || timestamp <= 0) return null;
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch {
    return null;
  }
}

async function findOrganizationBySubscription(subscription: Stripe.Subscription): Promise<string | undefined> {
  const metadataOrgId = subscription.metadata?.organization_id;
  if (metadataOrgId) return metadataOrgId;

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (org) return org.id;

  if (subscription.customer) {
    const { data: orgByCustomer } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single();

    return orgByCustomer?.id;
  }

  return undefined;
}

function comparePlanLevel(planA: string, planB: string): number {
  const order: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };
  return (order[planA] || 0) - (order[planB] || 0);
}

async function logSubscriptionEvent(data: {
  organization_id: string;
  event_type: string;
  stripe_event_id?: string;
  previous_plan?: string | null;
  new_plan?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  metadata?: Record<string, any>;
}) {
  try {
    await supabaseAdmin.from('subscription_events').insert(data);
  } catch (error) {
    console.error('[logSubscriptionEvent] Error:', error);
  }
}
