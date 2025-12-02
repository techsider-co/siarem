-- =============================================
-- UNALISI-OS MULTI-TENANCY MIGRATION
-- FAZ 1: Organizations, Members & RBAC
-- =============================================
-- Bu dosyayı Supabase SQL Editor'da çalıştırın
-- Önemli: Adım adım çalıştırmanız önerilir

-- =============================================
-- ADIM 1: ORGANIZATIONS TABLOSU
-- =============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Abonelik bilgileri (Stripe için)
  subscription_plan VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_ends_at TIMESTAMPTZ,
  
  -- Ayarlar (JSON)
  settings JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE public.organizations IS 'Müşteri organizasyonları/workspace''leri';
COMMENT ON COLUMN public.organizations.slug IS 'URL-dostu benzersiz isim';
COMMENT ON COLUMN public.organizations.subscription_plan IS 'free, starter, pro, enterprise';

-- =============================================
-- ADIM 2: ORG_MEMBERS TABLOSU
-- =============================================
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  
  -- Davet durumu
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

COMMENT ON TABLE public.org_members IS 'Kullanıcı-Organizasyon ilişki tablosu';
COMMENT ON COLUMN public.org_members.role IS 'owner, admin, member, viewer';
COMMENT ON COLUMN public.org_members.status IS 'pending, active, deactivated';

-- =============================================
-- ADIM 3: MEVCUT TABLOLARA organization_id EKLE
-- =============================================

-- Customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Proposals
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Contracts
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Profiles - Aktif organizasyon
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- =============================================
-- ADIM 4: INDEX'LER (Performans)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_org_id ON public.proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON public.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON public.transactions(organization_id);

-- =============================================
-- ADIM 5: YARDIMCI FONKSİYONLAR
-- =============================================

-- Kullanıcının üye olduğu organizasyonları getir
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM public.org_members 
  WHERE user_id = auth.uid() AND status = 'active'
$$ LANGUAGE sql SECURITY DEFINER;

-- Kullanıcının bir organizasyondaki rolünü getir
CREATE OR REPLACE FUNCTION public.get_user_role(org_id UUID)
RETURNS VARCHAR AS $$
  SELECT role 
  FROM public.org_members 
  WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND status = 'active'
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- ADIM 6: RLS'İ ETKİNLEŞTİR
-- =============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ADIM 7: ORGANIZATIONS POLİTİKALARI
-- =============================================

-- Sadece üyesi olduğun organizasyonları gör
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT public.get_user_organizations())
  );

-- Yeni organizasyon oluşturabilir
CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Sadece owner güncelleyebilir
CREATE POLICY "Owners can update their organizations" ON public.organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- =============================================
-- ADIM 8: ORG_MEMBERS POLİTİKALARI
-- =============================================

-- Kendi organizasyonundaki üyeleri gör
CREATE POLICY "View org members" ON public.org_members
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

-- Admin ve owner üye ekleyebilir
CREATE POLICY "Admins can add members" ON public.org_members
  FOR INSERT WITH CHECK (
    public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- Admin ve owner üye güncelleyebilir
CREATE POLICY "Admins can update members" ON public.org_members
  FOR UPDATE USING (
    public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- Admin ve owner üye silebilir
CREATE POLICY "Admins can delete members" ON public.org_members
  FOR DELETE USING (
    public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- =============================================
-- ADIM 9: CUSTOMERS POLİTİKALARI
-- =============================================

CREATE POLICY "View customers in org" ON public.customers
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY "Insert customers in org" ON public.customers
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Update customers in org" ON public.customers
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Delete customers in org" ON public.customers
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- =============================================
-- ADIM 10: PROPOSALS POLİTİKALARI
-- =============================================

CREATE POLICY "View proposals in org" ON public.proposals
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    OR access_key IS NOT NULL -- Public preview için
  );

CREATE POLICY "Insert proposals in org" ON public.proposals
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Update proposals in org" ON public.proposals
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Delete proposals in org" ON public.proposals
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- =============================================
-- ADIM 11: CONTRACTS POLİTİKALARI
-- =============================================

CREATE POLICY "View contracts in org" ON public.contracts
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
    OR access_key IS NOT NULL
  );

CREATE POLICY "Insert contracts in org" ON public.contracts
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Update contracts in org" ON public.contracts
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Delete contracts in org" ON public.contracts
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- =============================================
-- ADIM 12: PROJECTS POLİTİKALARI
-- =============================================

CREATE POLICY "View projects in org" ON public.projects
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY "Insert projects in org" ON public.projects
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Update projects in org" ON public.projects
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Delete projects in org" ON public.projects
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- =============================================
-- ADIM 13: TRANSACTIONS POLİTİKALARI
-- =============================================

CREATE POLICY "View transactions in org" ON public.transactions
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY "Insert transactions in org" ON public.transactions
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Update transactions in org" ON public.transactions
  FOR UPDATE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin')
  );

CREATE POLICY "Delete transactions in org" ON public.transactions
  FOR DELETE USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin')
  );

-- =============================================
-- ADIM 14: SERVICES & TASKS POLİTİKALARI
-- =============================================

CREATE POLICY "View services in org" ON public.services
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY "Manage services in org" ON public.services
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "View tasks in org" ON public.tasks
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY "Manage tasks in org" ON public.tasks
  FOR ALL USING (
    organization_id IN (SELECT public.get_user_organizations())
    AND public.get_user_role(organization_id) IN ('owner', 'admin', 'member')
  );

-- =============================================
-- ADIM 15: YENİ KULLANICI TRİGGER'I
-- =============================================
-- Yeni kullanıcı kayıt olduğunda otomatik organizasyon oluşturur

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_email TEXT;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Kullanıcı emailini al
  user_email := NEW.email;
  
  -- Email'den organizasyon adı oluştur
  org_name := split_part(user_email, '@', 1) || '''s Workspace';
  
  -- Benzersiz slug oluştur
  org_slug := lower(replace(split_part(user_email, '@', 1), '.', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- Yeni organizasyon oluştur
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (org_name, org_slug, NEW.id)
  RETURNING id INTO new_org_id;
  
  -- Kullanıcıyı owner olarak ekle
  INSERT INTO public.org_members (organization_id, user_id, role, status, accepted_at)
  VALUES (new_org_id, NEW.id, 'owner', 'active', NOW());
  
  -- Profil oluştur/güncelle
  INSERT INTO public.profiles (id, current_organization_id, email)
  VALUES (NEW.id, new_org_id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET 
    current_organization_id = new_org_id,
    email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mevcut trigger'ı sil ve yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TAMAMLANDI! ✅
-- =============================================
-- Bu migration'ı çalıştırdıktan sonra:
-- 1. Mevcut kullanıcılarınız için manuel organizasyon oluşturmanız gerekebilir
-- 2. Mevcut verilere organization_id atamanız gerekir
-- 3. Frontend'deki CRUD işlemlerinde organization_id kullanılmalı

