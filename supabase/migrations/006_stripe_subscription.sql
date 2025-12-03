-- =============================================
-- UNALISI-OS STRIPE SUBSCRIPTION MIGRATION
-- FAZ-6: Stripe Abonelik Sistemi
-- =============================================

-- =============================================
-- ADIM 1: ORGANIZATIONS TABLOSUNA STRİPE KOLONLARI EKLE
-- =============================================

-- Stripe Customer ID - Her organizasyonun Stripe'daki müşteri kimliği
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Stripe Subscription ID - Aktif aboneliğin Stripe'daki kimliği
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE;

-- Stripe Price ID - Hangi fiyat planına abone
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Trial (Deneme Süresi) bitiş tarihi
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Dönem sonunda iptal edilecek mi?
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Bir sonraki fatura tarihi
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Son ödeme durumu
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'none';

COMMENT ON COLUMN public.organizations.stripe_customer_id IS 'Stripe müşteri ID (cus_xxx)';
COMMENT ON COLUMN public.organizations.stripe_subscription_id IS 'Stripe abonelik ID (sub_xxx)';
COMMENT ON COLUMN public.organizations.stripe_price_id IS 'Stripe fiyat planı ID (price_xxx)';
COMMENT ON COLUMN public.organizations.trial_ends_at IS 'Deneme süresi bitiş tarihi';
COMMENT ON COLUMN public.organizations.cancel_at_period_end IS 'Mevcut dönem sonunda iptal edilecek mi';
COMMENT ON COLUMN public.organizations.current_period_end IS 'Mevcut abonelik dönemi bitiş tarihi';
COMMENT ON COLUMN public.organizations.payment_status IS 'Son ödeme durumu: none, succeeded, failed, pending';

-- =============================================
-- ADIM 2: ABONELİK GEÇMİŞİ TABLOSU
-- =============================================
-- Tüm abonelik değişikliklerini ve ödemeleri takip etmek için

CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Stripe bilgileri
  stripe_event_id VARCHAR(255) UNIQUE, -- Webhook event ID (duplicate kontrolü için)
  stripe_subscription_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  
  -- Olay bilgileri
  event_type VARCHAR(100) NOT NULL, -- created, updated, canceled, payment_succeeded, payment_failed
  
  -- Plan bilgileri
  plan_id VARCHAR(50), -- free, starter, pro, enterprise
  price_id VARCHAR(255), -- Stripe price ID
  
  -- Tutar bilgileri
  amount INTEGER, -- Cent cinsinden (örn: 2999 = $29.99)
  currency VARCHAR(10) DEFAULT 'usd',
  
  -- Durum
  status VARCHAR(50), -- active, trialing, past_due, canceled, unpaid
  
  -- Tarihler
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_history IS 'Abonelik değişiklikleri ve ödeme geçmişi';

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_subscription_history_org_id ON public.subscription_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON public.subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history(created_at DESC);

-- =============================================
-- ADIM 3: FATURALAR TABLOSU
-- =============================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Stripe bilgileri
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_invoice_number VARCHAR(100),
  stripe_hosted_invoice_url TEXT, -- Fatura görüntüleme linki
  stripe_invoice_pdf TEXT, -- PDF indirme linki
  
  -- Fatura bilgileri
  amount_due INTEGER NOT NULL, -- Cent cinsinden
  amount_paid INTEGER DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'usd',
  
  -- Durum
  status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
  
  -- Tarihler
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Plan bilgisi
  plan_name VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.invoices IS 'Stripe faturaları';

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- =============================================
-- ADIM 4: ABONELİK PLANLARI TABLOSU
-- =============================================
-- Tüm abonelik planlarını ve özelliklerini saklar

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id VARCHAR(50) PRIMARY KEY, -- free, starter, pro, enterprise
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Fiyatlandırma
  price_monthly INTEGER DEFAULT 0, -- Cent cinsinden
  price_yearly INTEGER DEFAULT 0, -- Cent cinsinden
  currency VARCHAR(10) DEFAULT 'usd',
  
  -- Stripe Price ID'leri
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  
  -- Limitler
  max_users INTEGER DEFAULT 1,
  max_projects INTEGER DEFAULT 5,
  max_customers INTEGER DEFAULT 10,
  max_proposals_per_month INTEGER DEFAULT 10,
  max_storage_mb INTEGER DEFAULT 100,
  
  -- Özellikler (JSON)
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Durum
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE, -- "En Popüler" badge'i için
  
  -- Sıralama
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_plans IS 'Abonelik planları ve özellikleri';

-- =============================================
-- ADIM 5: VARSAYILAN PLANLARI EKLE
-- =============================================

INSERT INTO public.subscription_plans (id, name, description, price_monthly, price_yearly, max_users, max_projects, max_customers, max_proposals_per_month, max_storage_mb, features, is_active, is_popular, sort_order)
VALUES 
  ('free', 'Ücretsiz', 'Başlangıç için ideal', 0, 0, 1, 3, 5, 5, 50, 
   '["Temel teklif oluşturma", "5 müşteriye kadar", "3 proje", "E-posta desteği"]'::jsonb, 
   true, false, 1),
   
  ('starter', 'Başlangıç', 'Küçük ekipler için', 2900, 29000, 3, 10, 25, 25, 500, 
   '["Gelişmiş teklif şablonları", "25 müşteriye kadar", "10 proje", "Sınırsız teklif", "PDF export", "Öncelikli destek"]'::jsonb, 
   true, false, 2),
   
  ('pro', 'Profesyonel', 'Büyüyen işletmeler için', 7900, 79000, 10, 50, 100, -1, 2000, 
   '["Tüm Başlangıç özellikleri", "100 müşteriye kadar", "50 proje", "Sınırsız teklif", "API erişimi", "Özel markalama", "Analitik raporlar"]'::jsonb, 
   true, true, 3),
   
  ('enterprise', 'Kurumsal', 'Büyük organizasyonlar için', 19900, 199000, -1, -1, -1, -1, 10000, 
   '["Tüm Pro özellikleri", "Sınırsız kullanıcı", "Sınırsız proje", "Özel entegrasyonlar", "Dedicated destek", "SLA garantisi", "On-premise seçeneği"]'::jsonb, 
   true, false, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_users = EXCLUDED.max_users,
  max_projects = EXCLUDED.max_projects,
  max_customers = EXCLUDED.max_customers,
  max_proposals_per_month = EXCLUDED.max_proposals_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- =============================================
-- ADIM 6: RLS POLİTİKALARI
-- =============================================

-- subscription_history
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View subscription history in org" ON public.subscription_history
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

-- Sadece service role ekleyebilir (webhook'tan)
CREATE POLICY "Service role can insert subscription history" ON public.subscription_history
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View invoices in org" ON public.invoices
  FOR SELECT USING (
    organization_id IN (SELECT public.get_user_organizations())
  );

CREATE POLICY "Service role can manage invoices" ON public.invoices
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- subscription_plans (herkes okuyabilir)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- =============================================
-- ADIM 7: YARDIMCI FONKSİYONLAR
-- =============================================

-- Organizasyonun aktif planını kontrol et
CREATE OR REPLACE FUNCTION public.get_org_subscription_status(org_id UUID)
RETURNS TABLE (
  plan_id VARCHAR,
  status VARCHAR,
  is_active BOOLEAN,
  is_trial BOOLEAN,
  days_remaining INTEGER
) AS $$
DECLARE
  org_record RECORD;
BEGIN
  SELECT 
    subscription_plan,
    subscription_status,
    subscription_ends_at,
    trial_ends_at
  INTO org_record
  FROM public.organizations
  WHERE id = org_id;
  
  plan_id := org_record.subscription_plan;
  status := org_record.subscription_status;
  
  -- Deneme süresinde mi?
  is_trial := org_record.trial_ends_at IS NOT NULL AND org_record.trial_ends_at > NOW();
  
  -- Abonelik aktif mi?
  is_active := org_record.subscription_status = 'active' 
    OR org_record.subscription_status = 'trialing'
    OR (org_record.subscription_ends_at IS NOT NULL AND org_record.subscription_ends_at > NOW());
  
  -- Kalan gün
  IF org_record.trial_ends_at IS NOT NULL AND org_record.trial_ends_at > NOW() THEN
    days_remaining := EXTRACT(DAY FROM org_record.trial_ends_at - NOW())::INTEGER;
  ELSIF org_record.subscription_ends_at IS NOT NULL AND org_record.subscription_ends_at > NOW() THEN
    days_remaining := EXTRACT(DAY FROM org_record.subscription_ends_at - NOW())::INTEGER;
  ELSE
    days_remaining := 0;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizasyonun limit kontrolü
CREATE OR REPLACE FUNCTION public.check_org_limit(
  org_id UUID,
  limit_type VARCHAR -- 'users', 'projects', 'customers', 'proposals'
)
RETURNS TABLE (
  current_count INTEGER,
  max_allowed INTEGER,
  is_exceeded BOOLEAN
) AS $$
DECLARE
  org_plan VARCHAR;
  plan_record RECORD;
BEGIN
  -- Organizasyonun planını al
  SELECT subscription_plan INTO org_plan
  FROM public.organizations WHERE id = org_id;
  
  -- Plan limitlerini al
  SELECT * INTO plan_record
  FROM public.subscription_plans WHERE id = COALESCE(org_plan, 'free');
  
  -- Limit tipine göre sayım yap
  CASE limit_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.org_members WHERE organization_id = org_id AND status = 'active';
      max_allowed := plan_record.max_users;
      
    WHEN 'projects' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.projects WHERE organization_id = org_id;
      max_allowed := plan_record.max_projects;
      
    WHEN 'customers' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.customers WHERE organization_id = org_id;
      max_allowed := plan_record.max_customers;
      
    WHEN 'proposals' THEN
      SELECT COUNT(*) INTO current_count
      FROM public.proposals 
      WHERE organization_id = org_id 
        AND created_at >= date_trunc('month', NOW());
      max_allowed := plan_record.max_proposals_per_month;
      
    ELSE
      current_count := 0;
      max_allowed := -1;
  END CASE;
  
  -- -1 = sınırsız
  is_exceeded := max_allowed != -1 AND current_count >= max_allowed;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADIM 8: INDEX'LER
-- =============================================

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription ON public.organizations(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);

-- =============================================
-- TAMAMLANDI! ✅
-- =============================================
-- Bu migration'ı çalıştırdıktan sonra:
-- 1. Stripe Dashboard'dan Price ID'leri alıp subscription_plans tablosunu güncelleyin
-- 2. Webhook endpoint'i oluşturun
-- 3. .env.local'a Stripe key'leri ekleyin (zaten eklendi)

