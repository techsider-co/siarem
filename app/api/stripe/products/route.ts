// app/api/stripe/products/route.ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripeProducts, getCurrencyFromCountry } from '@/lib/stripe';

export const revalidate = 3600; // 1 saat cache

export async function GET(request: Request) {
  try {
    // URL'den currency parametresini al
    const { searchParams } = new URL(request.url);
    let currency = searchParams.get('currency');
    
    // Currency belirtilmemişse, header'lardan ülke tespiti yap
    if (!currency) {
      const headersList = await headers();
      const country = headersList.get("x-vercel-ip-country") || 
                      headersList.get("cf-ipcountry") || 
                      "US";
      currency = getCurrencyFromCountry(country);
    }
    
    const products = await getStripeProducts(currency);
    
    return NextResponse.json({ 
      products,
      currency: currency.toLowerCase(),
    });
  } catch (error: any) {
    console.error('[Products API] Error:', error.message);
    return NextResponse.json(
      { error: 'Ürünler yüklenemedi' },
      { status: 500 }
    );
  }
}

