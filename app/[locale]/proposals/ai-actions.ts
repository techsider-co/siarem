// "use server";

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import * as cheerio from "cheerio";

// // Gemini İstemcisini Başlat
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// export async function analyzeWebsite(url: string) {
//   try {
//     // 1. URL Validasyon
//     let targetUrl = url;
//     if (!targetUrl.startsWith("http")) {
//       targetUrl = `https://${targetUrl}`;
//     }

//     // 2. Siteyi Kazı (Scrape)
//     const response = await fetch(targetUrl, {
//       headers: {
//         "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
//       },
//       next: { revalidate: 0 }
//     });

//     if (!response.ok) {
//       return { error: "Siteye erişilemedi. Linki kontrol edin." };
//     }

//     const html = await response.text();
//     const $ = cheerio.load(html);
    
//     // Gereksizleri temizle
//     $('script, style, nav, footer, svg, noscript').remove();
    
//     // İçeriği al ve temizle
//     const textContent = $('body')
//       .text()
//       .replace(/\s+/g, ' ')
//       .trim()
//       .slice(0, 10000); // Gemini Flash geniş context sever

//     if (textContent.length < 50) {
//       return { error: "Sitede yeterli içerik bulunamadı." };
//     }

//     // 3. ✅ DOĞRU MODEL ADI - 2024+ Güncel Sürüm
//     // Seçenekler:
//     // - "gemini-2.0-flash" → En hızlı ve güncel (ÖNERİLEN)
//     // - "gemini-1.5-flash" → Stabil alternatif
//     // - "gemini-1.5-pro" → Daha güçlü ama yavaş
//     const model = genAI.getGenerativeModel({ 
//       model: "gemini-2.0-flash"  // 🔥 HATA DÜZELTİLDİ
//     }); 

//     const prompt = `
//       Sen kıdemli bir Web Teknoloji Danışmanısın. Aşağıdaki web sitesi metnini analiz et.
      
//       Site İçeriği:
//       "${textContent}"

//       Görevin:
//       Bu siteyi teknik, UX ve SEO açısından eleştir. Müşteriyi "Yeni bir siteye ihtiyacım var" demeye ikna edecek en can alıcı 3 sorunu bul.
      
//       1. SORUNLAR: Sitenin eksiklerini veya geliştirilebilecek 3 kritik noktasını bul (Kısa başlık ve vurucu açıklama).
//       2. ÇÖZÜMLER: Bu eksikler için 3 profesyonel, modern ve teknik çözüm önerisi sun (Next.js, Vercel, React gibi teknolojileri öv).
//       3. SKORLAR: Tahmini performans skorları salla (0-100 arası). Müşteriyi korkutmak için mobil skorunu düşük ver.

//       ÇIKTI FORMATI (SADECE BU JSON FORMATINDA CEVAP VER):
//       {
//         "problems": [
//           { "title": "Sorun Başlığı", "description": "Sorunun detaylı açıklaması." },
//           { "title": "Sorun Başlığı", "description": "Sorunun detaylı açıklaması." },
//           { "title": "Sorun Başlığı", "description": "Sorunun detaylı açıklaması." }
//         ],
//         "solutions": [
//           { "title": "Çözüm Başlığı", "description": "Çözümün detaylı açıklaması." },
//           { "title": "Çözüm Başlığı", "description": "Çözümün detaylı açıklaması." },
//           { "title": "Çözüm Başlığı", "description": "Çözümün detaylı açıklaması." }
//         ],
//         "scores": {
//           "mobile": 65,
//           "access": 70,
//           "seo": 60,
//           "target": 99
//         }
//       }
//     `;

//     // 4. Gemini'ye Gönder
//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();

//     // 5. JSON Temizleme (Markdown bloklarını temizle)
//     const cleanedText = responseText
//       .replace(/```json/g, '')
//       .replace(/```/g, '')
//       .trim();
    
//     const data = JSON.parse(cleanedText);

//     return { data };

//   } catch (error: any) {
//     console.error("Gemini AI Hatası:", error);
    
//     // Detaylı hata mesajı
//     if (error.message?.includes("404") || error.message?.includes("not found")) {
//       return { 
//         error: "Model bulunamadı. API anahtarınızı ve model adını kontrol edin." 
//       };
//     }
    
//     return { error: "Analiz hatası: " + (error.message || "Bilinmeyen hata") };
//   }
// }

"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";

// Gemini İstemcisini Başlat
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- 1. GOOGLE PAGESPEED INSIGHTS FONKSİYONU ---
// Gerçek verileri çekmek için Google'ın ücretsiz API'sini kullanıyoruz.
async function fetchPageSpeedScores(url: string) {
  try {
    // Strateji: mobile (En kritik olan)
    const apiKey = process.env.GEMINI_API_KEY; // Genelde aynı proje içinde PageSpeed API de açıktır.
    // Eğer API Key sorun çıkarırsa key parametresini kaldırabilirsin (Kotasız çalışır).
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY&category=SEO&category=BEST_PRACTICES&key=${apiKey}`;

    const res = await fetch(apiUrl, { next: { revalidate: 0 } });
    
    if (!res.ok) {
      console.warn("PageSpeed API Hatası:", await res.text());
      return null; // Hata olursa null dön, AI tahmin etsin
    }

    const data = await res.json();
    
    return {
      mobile: Math.round(data.lighthouseResult.categories.performance.score * 100),
      access: Math.round(data.lighthouseResult.categories.accessibility.score * 100),
      seo: Math.round(data.lighthouseResult.categories.seo.score * 100),
      target: 98 // Hedefimiz hep yüksek
    };
  } catch (error) {
    console.error("PageSpeed Fetch Hatası:", error);
    return null;
  }
}

// --- 2. ANA ANALİZ FONKSİYONU ---
export async function analyzeWebsite(url: string) {
  try {
    // A. URL Validasyon
    let targetUrl = url;
    if (!targetUrl.startsWith("http")) targetUrl = `https://${targetUrl}`;

    // B. Paralel İşlem Başlat (Siteyi Tara + PageSpeed Skorlarını Çek)
    // İkisi aynı anda çalışsın ki vakit kaybetmeyelim.
    const [scrapeRes, realScores] = await Promise.all([
        fetch(targetUrl, { 
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
            next: { revalidate: 0 } 
        }),
        fetchPageSpeedScores(targetUrl)
    ]);

    if (!scrapeRes.ok) return { error: "Siteye erişilemedi." };

    const html = await scrapeRes.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, svg, noscript').remove();
    
    const textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000);
    const metaDescription = $('meta[name="description"]').attr('content') || "";
    const pageTitle = $('title').text();

    // C. Gemini Modeli (Güncel ve Hızlı)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Skorları AI'ya veriyoruz ki ona göre yorum yapsın
    const scoreContext = realScores 
        ? `Gerçek PageSpeed Skorları: Mobil ${realScores.mobile}, SEO ${realScores.seo}. Bu düşük skorları eleştir.`
        : `PageSpeed verisi alınamadı, site içeriğine göre tahmini düşük skorlar üret.`;

    // D. Gelişmiş Prompt (Full Teklif Oluşturucu)
    const prompt = `
      Sen "unalisi.dev" adında, modern web teknolojileri (Next.js, React) kullanan üst düzey bir dijital ajansın yapay zeka asistanısın.
      
      Müşteri Sitesi: "${pageTitle}"
      Site Açıklaması: "${metaDescription}"
      Site İçeriği (Özet): "${textContent.slice(0, 2000)}..."
      ${scoreContext}

      GÖREVİN:
      Bu verileri kullanarak müşteriyi ikna edecek, profesyonel ve satış odaklı TAM BİR TEKLİF PAKETİ oluştur.
      
      KURALLAR:
      1. Tüm açıklamalar VURUCU ve KISA olacak (Maksimum 2 cümle).
      2. Fiyatları Türkiye piyasasına uygun, "Freelancer" değil "Ajans" kalitesinde ver (Örn: Toplam 20.000 - 50.000 TL arası).
      3. Teknolojilerde mutlaka Next.js, Vercel, Tailwind vurgusu yap.
      
      Aşağıdaki JSON formatını eksiksiz doldur:

      {
        "analysis": {
          "problems": [
            { "title": "Sorun Başlığı (Örn: Yavaş Mobil Deneyim)", "description": "Sorun açıklaması (Max 2 cümle)." },
            { "title": "Sorun Başlığı", "description": "Açıklama." },
            { "title": "Sorun Başlığı", "description": "Açıklama." }
          ],
          "solutions": [
            { "title": "Çözüm Başlığı (Örn: Next.js Hızlandırma)", "description": "Çözüm açıklaması (Max 2 cümle)." },
            { "title": "Çözüm Başlığı", "description": "Açıklama." },
            { "title": "Çözüm Başlığı", "description": "Açıklama." }
          ],
          "scores": {
            "mobile": ${realScores ? realScores.mobile : "Tahmini sayı (düşük ver)"},
            "access": ${realScores ? realScores.access : "Tahmini sayı"},
            "seo": ${realScores ? realScores.seo : "Tahmini sayı"},
            "target": 99
          }
        },
        "techStack": [
           { "title": "Next.js (App Router)", "description": "Google'ın önerdiği, ışık hızında açılan modern altyapı." },
           { "title": "Teknoloji 2", "description": "Açıklama." },
           { "title": "Teknoloji 3", "description": "Açıklama." },
           { "title": "Teknoloji 4", "description": "Açıklama." }
        ],
        "timeline": [
           { "phase": "SPRINT 1 / GÜN 1-2", "title": "Kurulum & Analiz", "description": "Detaylı açıklama." },
           { "phase": "SPRINT 2 / GÜN 3-5", "title": "Geliştirme & Kodlama", "description": "Detaylı açıklama." },
           { "phase": "SPRINT 3 / GÜN 6-7", "title": "Test & Yayına Alma", "description": "Detaylı açıklama." }
        ],
        "services": [
           { "title": "Hizmet 1 (Örn: UI/UX Tasarım)", "description": "Detay (Max 2 cümle).", "price": 0 },
           { "title": "Hizmet 2 (Örn: Frontend Geliştirme)", "description": "Detay.", "price": 0 },
           { "title": "Hizmet 3 (Örn: SEO Paketi)", "description": "Detay.", "price": 0 }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return { data: JSON.parse(cleanedText) };

  } catch (error: any) {
    console.error("AI Hatası:", error);
    return { error: "Analiz hatası: " + (error.message || "Bilinmeyen hata") };
  }
}