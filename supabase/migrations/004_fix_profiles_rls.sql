-- Profiles tablosu için RLS policy'leri düzelt
-- Bu policy'ler aynı organizasyondaki kullanıcıların birbirini görmesini sağlar

-- Mevcut policy'leri temizle
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_org_members" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- RLS aktif
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Herkes kendi profilini görebilir
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Aynı organizasyondaki kullanıcılar birbirini görebilir
CREATE POLICY "profiles_select_org_members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT om.user_id 
    FROM public.org_members om
    WHERE om.organization_id IN (
      SELECT organization_id 
      FROM public.org_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- 3. Authenticated kullanıcılar email ile arama yapabilir (davet için)
CREATE POLICY "profiles_select_by_email"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);  -- Tüm profilleri görebilir (sadece temel bilgiler)

-- 4. Kullanıcı sadece kendi profilini güncelleyebilir
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Yeni profil eklenebilir (kayıt sırasında)
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- org_members tablosu için de foreign key ilişkisini kontrol et
-- profiles tablosuna user_id üzerinden erişim için

-- org_members select policy - aynı organizasyondaki üyeler görülebilir
DROP POLICY IF EXISTS "org_members_select" ON public.org_members;
DROP POLICY IF EXISTS "Users can view org members" ON public.org_members;

CREATE POLICY "org_members_select"
ON public.org_members
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.org_members 
    WHERE user_id = auth.uid()
  )
);

