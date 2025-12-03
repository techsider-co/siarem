// app/api/stripe/portal/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

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

    // 2. Organizasyon ID'sini al
    const { organizationId } = await req.json();

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
        { error: 'Bu organizasyon için fatura yönetme yetkiniz yok' },
        { status: 403 }
      );
    }

    // 4. Organizasyon bilgisini çek
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organizasyon bulunamadı' },
        { status: 404 }
      );
    }

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Bu organizasyonun aktif bir aboneliği yok' },
        { status: 400 }
      );
    }

    // 5. Billing Portal Session oluştur
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Portal açılamadı' },
      { status: 500 }
    );
  }
}

