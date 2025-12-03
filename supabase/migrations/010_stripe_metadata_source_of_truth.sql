-- Migration: Stripe Metadata as Source of Truth
-- Description: Updates organizations table to store dynamic limits from Stripe

-- =============================================
-- STEP 1: Ensure usage_limits column exists with proper structure
-- =============================================

-- Drop existing column if it has wrong type and recreate
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'organizations' 
             AND column_name = 'usage_limits') THEN
    -- Update default value to match Stripe metadata keys
    ALTER TABLE public.organizations 
    ALTER COLUMN usage_limits SET DEFAULT '{
      "max_users": 1,
      "max_org": 1,
      "max_projects": 3,
      "max_customers": 5,
      "max_proposals": 3
    }'::jsonb;
  ELSE
    -- Add the column
    ALTER TABLE public.organizations 
    ADD COLUMN usage_limits jsonb DEFAULT '{
      "max_users": 1,
      "max_org": 1,
      "max_projects": 3,
      "max_customers": 5,
      "max_proposals": 3
    }'::jsonb;
  END IF;
END $$;

-- =============================================
-- STEP 2: Ensure features column exists with proper structure
-- =============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'organizations' 
             AND column_name = 'features') THEN
    -- Update default value to match Stripe metadata keys
    ALTER TABLE public.organizations 
    ALTER COLUMN features SET DEFAULT '{
      "can_remove_branding": false,
      "smtp": false,
      "api_usage": false,
      "advanced_reporting": false,
      "primary_support": false,
      "white_label": false,
      "custom_domain": false
    }'::jsonb;
  ELSE
    ALTER TABLE public.organizations 
    ADD COLUMN features jsonb DEFAULT '{
      "can_remove_branding": false,
      "smtp": false,
      "api_usage": false,
      "advanced_reporting": false,
      "primary_support": false,
      "white_label": false,
      "custom_domain": false
    }'::jsonb;
  END IF;
END $$;

-- =============================================
-- STEP 3: Create helper function to check limits dynamically
-- =============================================

CREATE OR REPLACE FUNCTION check_organization_usage_limit(
  org_id uuid,
  limit_key text
) RETURNS boolean AS $$
DECLARE
  limit_value integer;
  current_count integer;
  usage_limits_json jsonb;
BEGIN
  -- Get usage_limits from organization
  SELECT usage_limits INTO usage_limits_json
  FROM public.organizations
  WHERE id = org_id;

  -- If no limits found, deny by default
  IF usage_limits_json IS NULL THEN
    RETURN false;
  END IF;

  -- Get the specific limit value
  -- Handle both snake_case and camelCase keys
  limit_value := COALESCE(
    (usage_limits_json->>limit_key)::integer,
    (usage_limits_json->>replace(limit_key, '_', ''))::integer,
    0
  );

  -- -1 means unlimited
  IF limit_value = -1 THEN
    RETURN true;
  END IF;

  -- Get current count based on limit type
  CASE limit_key
    WHEN 'max_users' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.org_members
      WHERE organization_id = org_id AND status = 'active';
    WHEN 'max_projects' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.projects
      WHERE organization_id = org_id;
    WHEN 'max_customers' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.customers
      WHERE organization_id = org_id AND is_archived = false;
    WHEN 'max_proposals' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.proposals
      WHERE organization_id = org_id AND is_archived = false;
    WHEN 'max_org' THEN
      -- Count organizations owned by the same user
      SELECT COUNT(*) INTO current_count
      FROM public.organizations o
      WHERE o.owner_id = (SELECT owner_id FROM public.organizations WHERE id = org_id);
    ELSE
      RETURN false;
  END CASE;

  -- Check if current count is below limit
  RETURN current_count < limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: Create function to check feature access
-- =============================================

CREATE OR REPLACE FUNCTION check_organization_feature_access(
  org_id uuid,
  feature_key text
) RETURNS boolean AS $$
DECLARE
  features_json jsonb;
  feature_value text;
BEGIN
  -- Get features from organization
  SELECT features INTO features_json
  FROM public.organizations
  WHERE id = org_id;

  -- If no features found, return false
  IF features_json IS NULL THEN
    RETURN false;
  END IF;

  -- Get the specific feature value (handle string booleans)
  feature_value := features_json->>feature_key;

  -- Handle various boolean representations
  RETURN feature_value IS NOT NULL AND (
    feature_value = 'true' OR 
    feature_value = '1' OR 
    feature_value::boolean = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 5: Update existing Free plan organizations
-- =============================================

UPDATE public.organizations
SET 
  usage_limits = '{
    "max_users": 1,
    "max_org": 1,
    "max_projects": 3,
    "max_customers": 5,
    "max_proposals": 3
  }'::jsonb,
  features = '{
    "can_remove_branding": false,
    "smtp": false,
    "api_usage": false,
    "advanced_reporting": false,
    "primary_support": false,
    "white_label": false,
    "custom_domain": false
  }'::jsonb
WHERE subscription_plan IS NULL OR subscription_plan = 'free';

-- =============================================
-- STEP 6: Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION check_organization_usage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_feature_access TO authenticated;

-- =============================================
-- STEP 7: Add indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_organizations_usage_limits 
ON public.organizations USING gin (usage_limits);

CREATE INDEX IF NOT EXISTS idx_organizations_features 
ON public.organizations USING gin (features);

-- Comments for documentation
COMMENT ON COLUMN public.organizations.usage_limits IS 'JSONB containing usage limits from Stripe Product metadata. -1 means unlimited.';
COMMENT ON COLUMN public.organizations.features IS 'JSONB containing feature flags from Stripe Product metadata.';
COMMENT ON FUNCTION check_organization_usage_limit IS 'Checks if organization can add more of a resource based on Stripe limits';
COMMENT ON FUNCTION check_organization_feature_access IS 'Checks if organization has access to a feature based on Stripe metadata';

