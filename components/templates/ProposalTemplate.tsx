"use client";

import React from "react";

// --- TİPLER ---
interface AnalysisItem { title: string; description: string; }
interface AnalysisData {
  problems: AnalysisItem[];
  solutions: AnalysisItem[];
  scores: { mobile: number; access: number; seo: number; target: number };
}
interface ServiceItem { title: string; description: string; price: number; }
interface TimelineItem { phase: string; title: string; description: string; }
interface TechStackItem { title: string; description: string; } // YENİ

interface ProposalData {
  proposal_no: string;
  created_at: string;
  valid_until: string;
  total_amount: number;
  discount_amount?: number;
  content: {
    services?: ServiceItem[];
    timeline?: TimelineItem[];
    analysis?: AnalysisData;
    techStack?: TechStackItem[]; // YENİ
  };
}

interface CustomerData {
  company_name: string;
  logo_url?: string;
  address?: string;
  city?: string;
  district?: string;
}

interface Props {
  proposal: ProposalData;
  customer: CustomerData;
}

export default function ProposalTemplate({ proposal, customer }: Props) {
  
  const services = proposal.content?.services || [];
  const timeline = proposal.content?.timeline || [];
  const analysis = proposal.content?.analysis || { problems: [], solutions: [], scores: { mobile:0, access:0, seo:0, target:0 } };
  // Teknoloji Yığını (Varsayılan boş)
  const techStack = proposal.content?.techStack || [];

  const subTotal = services.reduce((sum, item) => sum + Number(item.price), 0);
  const discount = Number(proposal.discount_amount) || 0;
  const displaySubTotal = subTotal; 
  const grandTotal = subTotal - discount;

  const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString("tr-TR") : "-";
  const formatCurrency = (amount: number) => amount.toLocaleString("tr-TR") + " ₺";

  // İkonlar için renk döngüsü (Mavi, Mor, Mavi, Mor...)
  const getIconStyle = (index: number) => {
      const isEven = index % 2 === 0;
      return {
          background: isEven ? 'rgba(37,99,235,0.1)' : 'rgba(124,58,237,0.1)',
          color: isEven ? '#2563eb' : '#7c3aed',
          border: isEven ? '1px solid rgba(37,99,235,0.2)' : '1px solid rgba(124,58,237,0.2)'
      };
  };

  return (
    <div className="preview-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        :root { --bg-light: #ffffff; --primary: #2563eb; --secondary: #7c3aed; --text-dark: #111827; --text-dim: #4b5563; --success: #059669; --danger: #dc2626; --border-light: rgba(0, 0, 0, 0.08); }
        @page { size: A4; margin: 0; }
        @media print { body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { break-after: page; page-break-after: always; } .no-print { display: none !important; } }
        .preview-container { font-family: 'Inter', sans-serif; color: var(--text-dark); width: 210mm; margin: 0 auto; background: white; }
        .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: #ffffff; background-image: linear-gradient(var(--border-light) 1px, transparent 1px), linear-gradient(90deg, var(--border-light) 1px, transparent 1px); background-size: 40px 40px; }
        .page::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 90% 10%, rgba(37, 99, 235, 0.08) 0%, transparent 40%), radial-gradient(circle at 10% 90%, rgba(124, 58, 237, 0.08) 0%, transparent 40%); }
        .content { padding: 50px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; position: relative; z-index: 2; }
        .logo { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; color: var(--text-dark); }
        .logo-icon { width: 24px; height: 24px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 6px; box-shadow: 0 4px 10px var(--accent-glow); }
        .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; margin-bottom: 40px; }
        .page-number { font-size: 12px; color: var(--text-dim); letter-spacing: 2px; font-weight: 700; }
        .section-title { font-size: 36px; font-weight: 800; margin-bottom: 30px; color: var(--text-dark); letter-spacing: -1px; position: relative; }
        .section-title::after { content: ""; position: absolute; left: 0; bottom: -10px; width: 60px; height: 3px; background: linear-gradient(to right, var(--primary), var(--secondary)); border-radius: 2px; }
        .glass-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
        .module-card { display: flex; align-items: flex-start; gap: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border-light); background: white; padding: 20px; border-radius: 12px; }
        .module-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .timeline { position: relative; padding: 20px 0; }
        .timeline::before { content: ""; position: absolute; left: 28px; top: 0; bottom: 0; width: 5px; background: linear-gradient(to bottom, var(--primary), var(--secondary)); border-radius: 4px; opacity: 0.3; }
        .timeline-item { position: relative; padding-left: 80px; margin-bottom: 40px; }
        .timeline-marker { position: absolute; left: 10px; top: 0; width: 32px; height: 32px; background: #fff; border: 4px solid var(--primary); border-radius: 50%; z-index: 2; box-shadow: 0 0 10px var(--accent-glow); }
        .invoice-box { background: white; border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); }
        .invoice-table { width: 100%; border-collapse: collapse; }
        .invoice-table th { text-align: left; padding: 15px 30px; font-size: 12px; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border-light); background: rgba(37, 99, 235, 0.03); }
        .invoice-table td { padding: 20px 30px; border-bottom: 1px solid var(--border-light); font-size: 14px; color: var(--text-dark); }
        .ruul-note { margin-top: 20px; font-size: 11px; color: #64748b; background: #f3f4f6; padding: 10px; border-radius: 6px; line-height: 1.5; border-left: 3px solid var(--secondary); }
        .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .diagnostic-card { position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .diagnostic-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
        .card-danger::before { background: var(--danger); } .card-success::before { background: var(--success); }
        .diag-list { list-style: none; padding: 0; margin: 0; }
      `}</style>

      {/* PAGE 1: KAPAK */}
      <div className="page">
        <div className="content" style={{ justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ position: 'absolute', top: 50, left: 50 }}><div className="logo"><div className="logo-icon"></div><span>unalisi<span style={{color: '#2563eb'}}>.dev</span></span></div></div>
          <div style={{ marginTop: 100 }}><div className="mission-badge" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '10px 20px', fontSize: 12, fontWeight: 700, borderRadius: 50, display: 'inline-block', marginBottom: 30, letterSpacing: 2 }}>/// DİJİTAL DÖNÜŞÜM RAPORU</div><h1 style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1, margin: 0, color: '#111827', background: 'linear-gradient(135deg, #111827 30%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Modern Web<br />Mimarisi & Performans<br />Raporu.</h1></div>
          <div style={{ paddingLeft: 20, marginBottom: 50, borderLeft: '4px solid #7c3aed', background: 'linear-gradient(to right, rgba(124, 58, 237, 0.05), transparent)', width: '100%', padding: 20, borderRadius: '0 8px 8px 0' }}>
            <div style={{ fontSize: 14, color: '#4b5563', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>HEDEF ORGANİZASYON</div>
            {customer.logo_url ? ( <div style={{ background: 'linear-gradient(135deg, #111827, #374151)', padding: '25px 40px', borderRadius: 12, display: 'inline-block', marginTop: 5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}><img src={customer.logo_url} alt="Logo" style={{ height: 60, width: 'auto', display: 'block', objectFit: 'contain' }} /></div> ) : ( <div style={{ fontSize: 32, fontWeight: 800, color: '#111827' }}>{customer.company_name}</div> )}
          </div>
          <div style={{ position: 'absolute', bottom: 50, left: 50, right: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><div><div style={{ color: '#111827', fontWeight: 800, fontSize: 16 }}>ÜNAL İSİ</div><div style={{ fontSize: 12, color: '#4b5563' }}>Bilgisayar Mühendisi | Full Stack Developer</div></div><div style={{ textAlign: 'right' }}><img src="/images/logo-light.png" alt="unalisi.dev" style={{ height: 40, width: 'auto', objectFit: 'contain' }} /></div></div>
        </div>
      </div>

      {/* PAGE 2: ANALİZ */}
      <div className="page">
        <div className="content">
          <div className="page-header"><div className="logo">unalisi.dev</div><div className="page-number">01. DURUM ANALİZİ</div></div>
          <h2 className="section-title">Sistem Tanıları & Fırsatlar</h2>
          <p style={{ color: '#4b5563', fontSize: 16, maxWidth: 800, lineHeight: 1.6, fontWeight: 500, marginBottom: 30 }}>Mevcut dijital varlığınız üzerinde yapılan taramalar, büyüme hedeflerinizi kısıtlayan kritik performans darboğazlarını ortaya çıkarmıştır.</p>
          <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
             <div className="glass-card" style={{ flex: 1, textAlign: 'center', borderBottom: '4px solid #d97706' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#d97706' }}>{analysis.scores.mobile}</div><div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', marginTop: 5 }}>MOBİL</div></div>
             <div className="glass-card" style={{ flex: 1, textAlign: 'center', borderBottom: '4px solid #dc2626' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#dc2626' }}>{analysis.scores.access}</div><div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', marginTop: 5 }}>ERİŞİM</div></div>
             <div className="glass-card" style={{ flex: 1, textAlign: 'center', borderBottom: '4px solid #d97706' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#d97706' }}>{analysis.scores.seo}</div><div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', marginTop: 5 }}>SEO</div></div>
             <div className="glass-card" style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', borderBottom: '4px solid #16a34a' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#16a34a' }}>{analysis.scores.target}+</div><div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginTop: 5 }}>HEDEF</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
             <div className="diagnostic-card card-danger" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 16, padding: 30 }}><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, color: '#dc2626' }}>KRİTİK TESPİTLER</div><ul className="diag-list">{analysis.problems.map((prob, i) => (<li key={i} style={{ marginBottom: 15, background: '#fff', padding: 10, borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 2 }}>✕ {prob.title}</div><div style={{ fontSize: 13, lineHeight: 1.5, color: '#4b5563' }}>{prob.description}</div></li>))}</ul></div>
             <div className="diagnostic-card card-success" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 16, padding: 30 }}><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, color: '#059669' }}>ÇÖZÜM VİZYONU</div><ul className="diag-list">{analysis.solutions.map((sol, i) => (<li key={i} style={{ marginBottom: 15, background: '#fff', padding: 10, borderRadius: 8 }}><div style={{ fontWeight: 700, color: '#166534', marginBottom: 2 }}>✓ {sol.title}</div><div style={{ fontSize: 13, lineHeight: 1.5, color: '#4b5563' }}>{sol.description}</div></li>))}</ul></div>
          </div>
          <div className="page-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><div>unalisi.dev</div><div>01 / 05</div></div>
        </div>
      </div>

      {/* PAGE 3: TEKNOLOJİ & KAPSAM (DİNAMİK) */}
      <div className="page">
        <div className="content">
          <div className="page-header"><div className="logo">unalisi.dev</div><div className="page-number">02. PROJE MODÜLLERİ</div></div>
          <h2 className="section-title">Entegre Edilecek Teknolojiler</h2>

          <div className="scope-grid" style={{ marginTop: 40 }}>
             {techStack.map((item, i) => (
                 <div key={i} className="module-card">
                    <div className="module-icon" style={getIconStyle(i)}>
                        {/* Basit bir ikon veya i numarası */}
                        <span style={{ fontSize: 18, fontWeight: 'bold' }}>{i + 1}</span>
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: 18, fontWeight: 700 }}>{item.title}</h3>
                        <p style={{ margin: 0, fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>{item.description}</p>
                    </div>
                 </div>
             ))}
          </div>
          <div className="page-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><div>unalisi.dev</div><div>02 / 05</div></div>
        </div>
      </div>

      {/* PAGE 4: ZAMAN */}
      <div className="page">
        <div className="content">
          <div className="page-header"><div className="logo">unalisi.dev</div><div className="page-number">03. ZAMAN YÖNETİMİ</div></div>
          <h2 className="section-title">Proje Zaman Çizelgesi</h2>
          <div className="timeline" style={{ marginTop: 50 }}>
             {timeline.map((item, idx) => (
                 <div key={idx} className="timeline-item" style={idx === timeline.length - 1 ? {marginBottom:0} : {}}>
                    <div className="timeline-marker" style={idx === timeline.length - 1 ? { background:'#2563eb', border:'none', boxShadow: '0 0 10px rgba(37,99,235,0.5)' } : {}}></div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', letterSpacing: 2, marginBottom: 5, textTransform: 'uppercase' }}>{item.phase}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 5, color: '#111827' }}>{item.title}</div>
                    <p style={{ color: '#4b5563', fontSize: 14, margin: 0, fontWeight: 500 }}>{item.description}</p>
                 </div>
             ))}
          </div>
          <div className="page-footer" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><div>unalisi.dev</div><div>03 / 05</div></div>
        </div>
      </div>

      {/* PAGE 5: FİYAT */}
      <div className="page">
        <div className="content">
          <div className="page-header"><div className="logo">unalisi.dev</div><div className="page-number">04. TİCARİ TEKLİF</div></div>
          <h2 className="section-title">Yatırım Planı & Özet</h2>
          <div className="invoice-box" style={{ marginTop: 20 }}>
             <div style={{ background: '#f8fafc', padding: '25px 30px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 5 }}>SAYIN / FİRMA</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{customer.company_name}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{customer.district && customer.city ? `${customer.district}, ${customer.city}` : 'Türkiye'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 1, marginBottom: 5 }}>TARİH & NO</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{formatDate(proposal.created_at)} / #{proposal.proposal_no}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Geçerlilik: {formatDate(proposal.valid_until)}</div>
                </div>
             </div>
             <table className="invoice-table">
                <thead><tr><th style={{ width: '70%' }}>HİZMET KAPSAMI</th><th style={{ textAlign: 'right' }}>YATIRIM BEDELİ</th></tr></thead>
                <tbody>
                    {services.map((s, i) => (
                        <tr key={i}>
                            <td><div style={{ fontWeight: 700, color: '#1e293b', marginBottom:5 }}>{s.title}</div><div style={{ fontSize: 12, color: '#64748b' }}>{s.description}</div></td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(Number(s.price))}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
             <div style={{ padding: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff' }}>
                <div style={{ flex: 1, paddingRight: 50 }}>
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ÖDEME YÖNTEMİ & GÜVENCE</div>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: 0 }}>Ödemeleriniz global çözüm ortağımız <strong>Ruul.io</strong> altyapısı ile güvence altındadır.</p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 15, opacity: 0.8 }}><span style={{fontWeight:'bold', color:'#1a1f71', fontSize: 14}}>VISA</span><span style={{fontWeight:'bold', color:'#eb001b', fontSize: 14}}>Mastercard</span></div>
                </div>
                <div style={{ width: 300 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#64748b', fontSize: 14 }}><span>Ara Toplam:</span><span style={discount > 0 ? { textDecoration: 'line-through', fontWeight: 500 } : { fontWeight: 500, color: '#334155' }}>{formatCurrency(displaySubTotal)}</span></div>
                    {discount > 0 && (<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: '#dc2626', fontSize: 14 }}><span style={{ fontWeight: 600 }}>🤝 Tanışma İskontosu:</span><span style={{ fontWeight: 700 }}>-{formatCurrency(discount)}</span></div>)}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, color: '#64748b', fontSize: 14 }}><span>KDV (0%) / Ruul:</span><span style={{ fontWeight: 500, color: '#334155' }}>0 ₺</span></div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: 15, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>GENEL TOPLAM</span><span style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{formatCurrency(grandTotal)}</span></div>
                </div>
             </div>
          </div>
          <div className="ruul-note"><strong>ⓘ Yasal Bilgilendirme:</strong> Bu belge proforma niteliğindedir. Hizmet ithalatı kapsamında olduğu için KDV (0%) ve Stopaj uygulanmaz. Resmi fatura (Commercial Invoice), ödeme sonrası Ruul tarafından düzenlenecektir.</div>
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><div><div style={{ fontWeight: 600, marginBottom: 40, textTransform: 'uppercase', color: '#4b5563' }}>MÜŞTERİ ONAYI</div><div style={{ borderTop: '2px solid #e5e7eb', width: 180, paddingTop: 10 }}>İmza / Tarih</div></div><div style={{ textAlign: 'right' }}><img src="/images/logo-light.png" alt="unalisi.dev" style={{ height: 40, width: 'auto', objectFit: 'contain' }} /></div></div>
        </div>
      </div>
    </div>
  );
}