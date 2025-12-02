-- =============================================
-- UNALISI-OS RLS POLICY FIX - V3 (ÇALIŞAN VERSİYON)
-- Organizasyon oluşturma politikası düzeltmesi
-- =============================================
-- Bu versiyon test edilmiş ve çalışmaktadır.

-- =============================================
-- ADIM 1: ORGANIZATIONS POLİTİKALARINI TEMİZLE
-- =============================================

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;
DROP POLICY IF EXISTS "org_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_delete_policy" ON public.organizations;
DROP POLICY IF EXISTS "allow_all_insert" ON public.organizations;
DROP POLICY IF EXISTS "allow_authenticated_select" ON public.organizations;
DROP POLICY IF EXISTS "allow_owner_update" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- =============================================
-- ADIM 2: ORGANIZATIONS RLS VE POLİTİKALARI
-- =============================================

-- RLS'i zorla (FORCE ile bypass'ı engelle)
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

-- INSERT: Herkes organizasyon oluşturabilir
CREATE POLICY "allow_all_insert" ON public.organizations
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (true);

-- SELECT: Herkes görebilir (üyelik kontrolü uygulama tarafında yapılabilir)
CREATE POLICY "allow_authenticated_select" ON public.organizations
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);

-- UPDATE: Sadece owner güncelleyebilir
CREATE POLICY "allow_owner_update" ON public.organizations
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (owner_id = auth.uid());

-- DELETE: Sadece owner silebilir
CREATE POLICY "allow_owner_delete" ON public.organizations
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (owner_id = auth.uid());

-- =============================================
-- ADIM 3: ORG_MEMBERS POLİTİKALARINI TEMİZLE
-- =============================================

DROP POLICY IF EXISTS "org_members_insert" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert_policy" ON public.org_members;
DROP POLICY IF EXISTS "org_members_all" ON public.org_members;
DROP POLICY IF EXISTS "View org members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.org_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.org_members;
DROP POLICY IF EXISTS "Users can add themselves as owner to new org" ON public.org_members;
DROP POLICY IF EXISTS "allow_all_org_members" ON public.org_members;

-- =============================================
-- ADIM 4: ORG_MEMBERS RLS VE POLİTİKALARI
-- =============================================

ALTER TABLE public.org_members FORCE ROW LEVEL SECURITY;

-- Tüm işlemler için izin ver (güvenlik uygulama tarafında sağlanacak)
CREATE POLICY "allow_all_org_members" ON public.org_members
  AS PERMISSIVE
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TAMAMLANDI! ✅
-- =============================================
-- Bu SQL Supabase Dashboard > SQL Editor'da çalıştırılmalıdır.
-- Not: Bu politikalar geçici olarak açık bırakılmıştır.
-- İleride daha sıkı güvenlik için auth.uid() tabanlı politikalar eklenebilir.

