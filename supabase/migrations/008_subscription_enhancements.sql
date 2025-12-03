-- Migration: Enhanced Subscription System
-- Description: Add granular subscription tracking columns to organizations table

-- =============================================
-- STEP 1: Add new columns to organizations
-- =============================================

-- Billing cycle (month or year)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_cycle text 
CHECK (billing_cycle IN ('month', 'year'));

-- Trial tracking
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_trial_used boolean DEFAULT false;

-- Cached plan features from Stripe (prevents constant API calls)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{
  "smtp": false,
  "removeBranding": false,
  "apiAccess": false,
  "prioritySupport": false,
  "customDomain": false,
  "whiteLabel": false,
  "advancedAnalytics": false
}'::jsonb;

-- Cached usage limits from Stripe
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS usage_limits jsonb DEFAULT '{
  "maxUsers": 1,
  "maxProjects": 3,
  "maxCustomers": 50,
  "maxProposals": 10
}'::jsonb;

-- Currency used for billing
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_currency text DEFAULT 'usd'
CHECK (billing_currency IN ('usd', 'try'));

-- =============================================
-- STEP 2: Create subscription_events table for audit log
-- =============================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  previous_plan text,
  new_plan text,
  previous_status text,
  new_status text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_org_id 
ON public.subscription_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created 
ON public.subscription_events(created_at DESC);

-- =============================================
-- STEP 3: Create function to check organization limits
-- =============================================

CREATE OR REPLACE FUNCTION check_organization_limit(
  org_id uuid,
  limit_key text,
  current_count integer
) RETURNS boolean AS $$
DECLARE
  limit_value integer;
  usage_limits_json jsonb;
BEGIN
  -- Get usage_limits from organization
  SELECT usage_limits INTO usage_limits_json
  FROM public.organizations
  WHERE id = org_id;

  -- If no limits found, return false (no access)
  IF usage_limits_json IS NULL THEN
    RETURN false;
  END IF;

  -- Get the specific limit value
  limit_value := (usage_limits_json->>limit_key)::integer;

  -- -1 means unlimited
  IF limit_value = -1 THEN
    RETURN true;
  END IF;

  -- Check if current count is below limit
  RETURN current_count < limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: Create function to check feature access
-- =============================================

CREATE OR REPLACE FUNCTION check_organization_feature(
  org_id uuid,
  feature_key text
) RETURNS boolean AS $$
DECLARE
  features_json jsonb;
  has_feature boolean;
BEGIN
  -- Get features from organization
  SELECT features INTO features_json
  FROM public.organizations
  WHERE id = org_id;

  -- If no features found, return false
  IF features_json IS NULL THEN
    RETURN false;
  END IF;

  -- Get the specific feature value
  has_feature := (features_json->>feature_key)::boolean;

  RETURN COALESCE(has_feature, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 5: Create trigger to reset to free plan when subscription ends
-- =============================================

CREATE OR REPLACE FUNCTION reset_to_free_plan()
RETURNS trigger AS $$
BEGIN
  -- If subscription status changes to 'canceled' or ends
  IF NEW.subscription_status = 'canceled' OR 
     (NEW.current_period_end IS NOT NULL AND NEW.current_period_end < NOW() AND NEW.cancel_at_period_end = true) THEN
    
    -- Reset to free plan limits
    NEW.subscription_plan := 'free';
    NEW.features := '{
      "smtp": false,
      "removeBranding": false,
      "apiAccess": false,
      "prioritySupport": false,
      "customDomain": false,
      "whiteLabel": false,
      "advancedAnalytics": false
    }'::jsonb;
    NEW.usage_limits := '{
      "maxUsers": 1,
      "maxProjects": 3,
      "maxCustomers": 50,
      "maxProposals": 10
    }'::jsonb;
    NEW.stripe_subscription_id := NULL;
    NEW.stripe_price_id := NULL;
    NEW.billing_cycle := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_reset_to_free_plan ON public.organizations;

CREATE TRIGGER trigger_reset_to_free_plan
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION reset_to_free_plan();

-- =============================================
-- STEP 6: Update existing organizations with default values
-- =============================================

UPDATE public.organizations
SET 
  features = COALESCE(features, '{
    "smtp": false,
    "removeBranding": false,
    "apiAccess": false,
    "prioritySupport": false,
    "customDomain": false,
    "whiteLabel": false,
    "advancedAnalytics": false
  }'::jsonb),
  usage_limits = COALESCE(usage_limits, '{
    "maxUsers": 1,
    "maxProjects": 3,
    "maxCustomers": 50,
    "maxProposals": 10
  }'::jsonb),
  is_trial_used = COALESCE(is_trial_used, false)
WHERE subscription_plan IS NULL OR subscription_plan = 'free';

-- =============================================
-- STEP 7: RLS Policies for subscription_events
-- =============================================

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org subscription events"
ON public.subscription_events
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.org_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- =============================================
-- STEP 8: Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION check_organization_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_feature TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;

COMMENT ON TABLE public.subscription_events IS 'Audit log for all subscription changes';
COMMENT ON COLUMN public.organizations.features IS 'Cached feature flags from Stripe product metadata';
COMMENT ON COLUMN public.organizations.usage_limits IS 'Cached usage limits from Stripe product metadata';
COMMENT ON COLUMN public.organizations.is_trial_used IS 'Flag to prevent trial abuse';

