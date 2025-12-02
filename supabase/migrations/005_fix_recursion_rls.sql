-- =====================================================
-- ÖNCEKİ POLICY'LERİ TEMİZLE (Recursion hatası veriyor)
-- =====================================================

-- org_members için tüm policy'leri kaldır
DROP POLICY IF EXISTS "org_members_select" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_update" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.org_members;
DROP POLICY IF EXISTS "allow_all_org_members" ON public.org_members;
DROP POLICY IF EXISTS "Users can view org members" ON public.org_members;

-- profiles için tüm policy'leri kaldır
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org_members" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_by_email" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- =====================================================
-- YENİ BASIT POLICY'LER (Recursion olmadan)
-- =====================================================

-- RLS aktif olduğundan emin ol
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORG_MEMBERS POLICY'LERİ
-- =====================================================

-- Basit SELECT: Authenticated kullanıcı kendi üyeliklerini ve 
-- aynı org'daki üyeleri görebilir (SECURITY DEFINER helper function ile)

-- Helper function: Kullanıcının organizasyon ID'lerini döndür
CREATE OR REPLACE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.org_members WHERE user_id = user_uuid
$$;

-- org_members SELECT - kullanıcı kendi org'larındaki üyeleri görebilir
CREATE POLICY "org_members_select_policy"
ON public.org_members
FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- org_members INSERT - authenticated kullanıcılar ekleyebilir
CREATE POLICY "org_members_insert_policy"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- org_members UPDATE - owner/admin güncelleyebilir
CREATE POLICY "org_members_update_policy"
ON public.org_members
FOR UPDATE
TO authenticated
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- org_members DELETE - owner/admin silebilir
CREATE POLICY "org_members_delete_policy"
ON public.org_members
FOR DELETE
TO authenticated
USING (
  organization_id IN (SELECT get_user_org_ids(auth.uid()))
);

-- =====================================================
-- PROFILES POLICY'LERİ
-- =====================================================

-- profiles SELECT - tüm authenticated kullanıcılar görebilir (email araması için)
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- profiles INSERT - sadece kendi ID'si ile ekleyebilir
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- profiles UPDATE - sadece kendi profilini güncelleyebilir
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =====================================================
-- ORGANIZATIONS POLICY'LERİ (Kontrol et)
-- =====================================================

-- Mevcut policy'leri kontrol et ve düzelt
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "allow_authenticated_select" ON public.organizations;

-- organizations SELECT - herkes görebilir
CREATE POLICY "organizations_select_policy"
ON public.organizations
FOR SELECT
TO authenticated
USING (true);

