// app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import { getTrialDays, getPlanIdFromPriceId } from '@/config/subscriptions';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Kullanıcıyı doğrula
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }

    // 2. Body'den seçilen paketin priceId'sini ve Organizasyon ID'sini al
    const { priceId, organizationId } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID gerekli' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organizasyon ID gerekli' },
        { status: 400 }
      );
    }

    // 3. Kullanıcının bu organizasyona erişimi var mı kontrol et
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Bu organizasyon için abonelik yönetme yetkiniz yok' },
        { status: 403 }
      );
    }

    // 4. Organizasyon bilgisini çek (trial durumu dahil)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id, stripe_subscription_id, is_trial_used')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      );
    }

    // 5. Trial eligibility check
    const planId = getPlanIdFromPriceId(priceId);
    const trialDays = getTrialDays(planId);
    const isEligibleForTrial = !org.is_trial_used && trialDays > 0;

    let customerId = org.stripe_customer_id;

    // 5. Eğer bu organizasyonun Stripe'da kaydı yoksa, oluştur
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          supabase_org_id: organizationId,
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Veritabanına kaydet
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId);
    }

    // 6. Müşterinin aktif aboneliklerini Stripe'dan kontrol et
    // (Veritabanı güncel olmayabilir, direkt Stripe'dan çekelim)
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const currentSubscription = activeSubscriptions.data[0];

    if (currentSubscription) {
      console.log('[Checkout] Found active subscription:', currentSubscription.id);
      
      // Veritabanını güncelle (sync)
      if (org.stripe_subscription_id !== currentSubscription.id) {
        await supabase
          .from('organizations')
          .update({ stripe_subscription_id: currentSubscription.id })
          .eq('id', organizationId);
      }

      // Mevcut subscription item'ı bul
      const subscriptionItemId = currentSubscription.items.data[0]?.id;
      
      if (!subscriptionItemId) {
        return NextResponse.json(
          { error: 'Mevcut abonelik öğesi bulunamadı' },
          { status: 400 }
        );
      }

      // Mevcut fiyatın para birimini kontrol et
      const currentPriceId = currentSubscription.items.data[0]?.price?.id;
      const currentCurrency = currentSubscription.currency;
      
      // Yeni fiyatın para birimini al
      const newPrice = await stripe.prices.retrieve(priceId);
      const newCurrency = newPrice.currency;

      // Para birimi uyumsuzluğu varsa
      if (currentCurrency !== newCurrency) {
        console.log(`[Checkout] Currency mismatch: current=${currentCurrency}, new=${newCurrency}`);
        return NextResponse.json(
          { 
            error: `Para birimi uyumsuzluğu: Mevcut aboneliğiniz ${currentCurrency.toUpperCase()} para biriminde. Lütfen aynı para birimindeki planları seçin veya mevcut aboneliğinizi iptal edip yeniden başlayın.`,
            type: 'currency_mismatch',
            currentCurrency,
            newCurrency,
          },
          { status: 400 }
        );
      }

      // Aboneliği güncelle (plan değişikliği)
      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.id,
        {
          items: [
            {
              id: subscriptionItemId,
              price: priceId,
            },
          ],
          proration_behavior: 'create_prorations', // Kalan süre için orantılı hesaplama
          metadata: {
            organization_id: organizationId,
          },
        }
      );

      console.log('[Checkout] Subscription updated:', updatedSubscription.id);

      // Webhook güncellemesi beklemeden frontend'i bilgilendir
      return NextResponse.json({
        type: 'subscription_updated',
        subscriptionId: updatedSubscription.id,
        message: 'Planınız başarıyla güncellendi!',
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success&upgraded=true`,
      });
    }

    // 7. Yeni abonelik için Checkout Session oluştur
    const sessionParams: any = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/organization?payment=cancelled`,
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
        },
      },
      metadata: {
        organization_id: organizationId,
        user_id: user.id,
      },
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      allow_promotion_codes: true,
    };

    // Add trial period if eligible
    if (isEligibleForTrial) {
      console.log(`[Checkout] Adding ${trialDays}-day trial for org ${organizationId}`);
      sessionParams.subscription_data.trial_period_days = trialDays;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      type: 'checkout_session',
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Ödeme işlemi başlatılamadı' },
      { status: 500 }
    );
  }
}

