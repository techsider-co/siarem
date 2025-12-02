-- =============================================
-- MEVCUT VERİLERİ MİGRATE ET
-- =============================================
-- Bu script'i 001_multi_tenancy.sql'den SONRA çalıştırın
-- UYARI: Bu script'i production'da dikkatli çalıştırın!

-- =============================================
-- ADIM 1: MEVCUT KULLANICILAR İÇİN ORGANİZASYON OLUŞTUR
-- =============================================
-- Her kullanıcı için otomatik organizasyon oluştur

DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
  org_slug TEXT;
BEGIN
  -- Organizasyonu olmayan tüm kullanıcıları bul
  FOR user_record IN 
    SELECT au.id, au.email, p.full_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE au.id NOT IN (
      SELECT DISTINCT user_id FROM public.org_members WHERE status = 'active'
    )
  LOOP
    -- Benzersiz slug oluştur
    org_slug := lower(replace(split_part(user_record.email, '@', 1), '.', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Organizasyon oluştur
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)) || '''s Workspace',
      org_slug,
      user_record.id
    )
    RETURNING id INTO new_org_id;
    
    -- Kullanıcıyı owner olarak ekle
    INSERT INTO public.org_members (organization_id, user_id, role, status, accepted_at)
    VALUES (new_org_id, user_record.id, 'owner', 'active', NOW());
    
    -- Profili güncelle
    UPDATE public.profiles 
    SET current_organization_id = new_org_id
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Organizasyon oluşturuldu: % için %', user_record.email, new_org_id;
  END LOOP;
END $$;

-- =============================================
-- ADIM 2: MEVCUT VERİLERE organization_id ATA
-- =============================================
-- Eğer tek kullanıcılı sistemse, tüm verileri ilk organizasyona ata

-- Önce organization_id'si NULL olan kayıtları kontrol et
DO $$
DECLARE
  first_org_id UUID;
BEGIN
  -- İlk organizasyonu bul
  SELECT id INTO first_org_id FROM public.organizations LIMIT 1;
  
  IF first_org_id IS NULL THEN
    RAISE NOTICE 'Hiç organizasyon bulunamadı. Önce kullanıcı oluşturun.';
    RETURN;
  END IF;
  
  -- Customers
  UPDATE public.customers 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  -- Proposals
  UPDATE public.proposals 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  -- Contracts
  UPDATE public.contracts 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  -- Projects
  UPDATE public.projects 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  -- Services
  UPDATE public.services 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  -- Tasks
  UPDATE public.tasks 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  -- Transactions
  UPDATE public.transactions 
  SET organization_id = first_org_id 
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Tüm veriler % organizasyonuna atandı', first_org_id;
END $$;

-- =============================================
-- ADIM 3: organization_id ZORUNLU YAP (Opsiyonel)
-- =============================================
-- Migration tamamlandıktan sonra çalıştırabilirsiniz

-- ALTER TABLE public.customers ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.proposals ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.contracts ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.projects ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.services ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.transactions ALTER COLUMN organization_id SET NOT NULL;

-- =============================================
-- DOĞRULAMA SORGULARI
-- =============================================

-- Organizasyon sayısını kontrol et
-- SELECT COUNT(*) as org_count FROM public.organizations;

-- Üye sayısını kontrol et
-- SELECT COUNT(*) as member_count FROM public.org_members;

-- organization_id'si NULL olan kayıtları kontrol et
-- SELECT 'customers' as table_name, COUNT(*) as null_count FROM public.customers WHERE organization_id IS NULL
-- UNION ALL
-- SELECT 'proposals', COUNT(*) FROM public.proposals WHERE organization_id IS NULL
-- UNION ALL
-- SELECT 'contracts', COUNT(*) FROM public.contracts WHERE organization_id IS NULL;

