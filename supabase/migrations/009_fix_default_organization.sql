-- Migration: Fix Default Organization Creation
-- Description: Ensures new users automatically get a default organization

-- =============================================
-- STEP 1: Create function to handle new user registration
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
  user_name text;
  org_name text;
  org_slug text;
BEGIN
  -- Extract user name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate organization name and slug
  org_name := user_name || '''ın Organizasyonu';
  org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- 1. Create profile if not exists
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, user_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);

  -- 2. Create default organization with FREE plan
  INSERT INTO public.organizations (
    name,
    slug,
    owner_id,
    subscription_plan,
    subscription_status,
    features,
    usage_limits
  )
  VALUES (
    org_name,
    org_slug,
    NEW.id,
    'free',
    'active',
    '{
      "smtp": false,
      "removeBranding": false,
      "apiAccess": false,
      "prioritySupport": false,
      "customDomain": false,
      "whiteLabel": false,
      "advancedAnalytics": false
    }'::jsonb,
    '{
      "maxUsers": 1,
      "maxProjects": 3,
      "maxCustomers": 50,
      "maxProposals": 10
    }'::jsonb
  )
  RETURNING id INTO new_org_id;

  -- 3. Add user as owner of the organization
  INSERT INTO public.org_members (
    organization_id,
    user_id,
    role,
    status
  )
  VALUES (
    new_org_id,
    NEW.id,
    'owner',
    'active'
  );

  -- 4. Set this as the user's current organization
  UPDATE public.profiles
  SET current_organization_id = new_org_id
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 2: Create or replace the trigger
-- =============================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STEP 3: Ensure profiles table has current_organization_id
-- =============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- =============================================
-- STEP 4: Create function to check if user has organizations
-- =============================================

CREATE OR REPLACE FUNCTION public.ensure_user_has_organization(user_uuid uuid)
RETURNS uuid AS $$
DECLARE
  existing_org_id uuid;
  new_org_id uuid;
  user_email text;
  user_name text;
  org_name text;
  org_slug text;
BEGIN
  -- Check if user already has an organization
  SELECT om.organization_id INTO existing_org_id
  FROM public.org_members om
  WHERE om.user_id = user_uuid
    AND om.status = 'active'
  ORDER BY om.created_at ASC
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    -- Update profile's current org if not set
    UPDATE public.profiles
    SET current_organization_id = existing_org_id
    WHERE id = user_uuid AND current_organization_id IS NULL;
    
    RETURN existing_org_id;
  END IF;

  -- User has no organization, create one
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = user_uuid;
  
  user_name := COALESCE(user_name, split_part(user_email, '@', 1));
  org_name := user_name || '''ın Organizasyonu';
  org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create organization
  INSERT INTO public.organizations (
    name, slug, owner_id, subscription_plan, subscription_status,
    features, usage_limits
  )
  VALUES (
    org_name, org_slug, user_uuid, 'free', 'active',
    '{"smtp": false, "removeBranding": false, "apiAccess": false, "prioritySupport": false, "customDomain": false, "whiteLabel": false, "advancedAnalytics": false}'::jsonb,
    '{"maxUsers": 1, "maxProjects": 3, "maxCustomers": 50, "maxProposals": 10}'::jsonb
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO public.org_members (organization_id, user_id, role, status)
  VALUES (new_org_id, user_uuid, 'owner', 'active');

  -- Update profile
  UPDATE public.profiles
  SET current_organization_id = new_org_id
  WHERE id = user_uuid;

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_has_organization TO authenticated;

-- =============================================
-- STEP 5: Fix existing users without organizations
-- =============================================

-- This will create organizations for any existing users who don't have one
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, p.full_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.org_members om 
      WHERE om.user_id = au.id AND om.status = 'active'
    )
  LOOP
    PERFORM public.ensure_user_has_organization(user_record.id);
    RAISE NOTICE 'Created organization for user: %', user_record.email;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates profile, organization, and membership for new users';
COMMENT ON FUNCTION public.ensure_user_has_organization IS 'Ensures a user has at least one organization, creates one if not';

