// app/api/stripe/subscription-info/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Kullanıcıyı doğrula
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Organizasyon bilgisini çek
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_plan, subscription_status, current_period_end, cancel_at_period_end')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Eğer abonelik yoksa free plan döndür
    if (!org.stripe_subscription_id && org.subscription_plan === 'free') {
      return NextResponse.json({
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        status: 'free',
        plan: 'free',
        interval: null,
        priceId: null,
      });
    }

    // Stripe subscription ID varsa, canlı veriyi Stripe'dan çek
    if (org.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id) as any;
        
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const priceId = subscription.items.data[0]?.price?.id;
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        
        // Veritabanını güncelle (current_period_end yoksa)
        if (!org.current_period_end || org.current_period_end !== currentPeriodEnd) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: subscription.status,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_price_id: priceId,
            })
            .eq('id', organizationId);
        }

        return NextResponse.json({
          currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          status: subscription.status,
          plan: org.subscription_plan || 'free',
          interval: interval || 'month',
          priceId: priceId,
        });
      } catch (stripeError: any) {
        console.error('Stripe subscription retrieve error:', stripeError);
        // Stripe'dan çekilemezse DB'deki veriyi döndür
      }
    }

    // Stripe customer ID varsa ama subscription ID yoksa, müşterinin aboneliklerini listele
    if (org.stripe_customer_id && !org.stripe_subscription_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: org.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      const subscription = subscriptions.data[0] as any;
      
      if (subscription) {
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const priceId = subscription.items.data[0]?.price?.id;
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        
        // Veritabanını güncelle
        await supabase
          .from('organizations')
          .update({
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            stripe_price_id: priceId,
          })
          .eq('id', organizationId);

        return NextResponse.json({
          currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          status: subscription.status,
          plan: org.subscription_plan || 'free',
          interval: interval || 'month',
          priceId: priceId,
        });
      }
    }

    // Veritabanındaki mevcut veriyi döndür
    return NextResponse.json({
      currentPeriodEnd: org.current_period_end,
      cancelAtPeriodEnd: org.cancel_at_period_end || false,
      status: org.subscription_status || 'inactive',
      plan: org.subscription_plan || 'free',
      interval: null,
      priceId: org.stripe_price_id,
    });

  } catch (error: any) {
    console.error('Subscription info error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription info' },
      { status: 500 }
    );
  }
}

