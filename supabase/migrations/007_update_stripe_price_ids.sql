-- =============================================
-- STRIPE PRICE ID'LERİ GÜNCELLEME
-- =============================================
-- Bu SQL'i Stripe Dashboard'dan aldığınız Price ID'leri ile güncelleyin
-- Örnek: price_1ABC123xyz şeklinde ID'ler

-- NOT: Aşağıdaki Price ID'leri kendi Stripe Dashboard'unuzdaki
-- gerçek Price ID'leri ile değiştirin!

-- STARTER PLAN
UPDATE public.subscription_plans
SET 
  stripe_price_id_monthly = 'price_YOUR_STARTER_MONTHLY_ID',
  stripe_price_id_yearly = 'price_YOUR_STARTER_YEARLY_ID'
WHERE id = 'starter';

-- PRO PLAN
UPDATE public.subscription_plans
SET 
  stripe_price_id_monthly = 'price_YOUR_PRO_MONTHLY_ID',
  stripe_price_id_yearly = 'price_YOUR_PRO_YEARLY_ID'
WHERE id = 'pro';

-- ENTERPRISE PLAN
UPDATE public.subscription_plans
SET 
  stripe_price_id_monthly = 'price_YOUR_ENTERPRISE_MONTHLY_ID',
  stripe_price_id_yearly = 'price_YOUR_ENTERPRISE_YEARLY_ID'
WHERE id = 'enterprise';

-- =============================================
-- DOĞRULAMA
-- =============================================
-- Güncellemeyi kontrol edin:
SELECT id, name, stripe_price_id_monthly, stripe_price_id_yearly 
FROM public.subscription_plans 
ORDER BY sort_order;

