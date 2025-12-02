"use client";

import React from "react";

// --- TİPLER ---
interface ContractClause {
  title: string;
  content: string;
}

interface ContractData {
  contract_no: string;
  created_at: string;
  content: {
    clauses?: ContractClause[];
  };
}

interface CustomerData {
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  tax_office?: string;
  tax_number?: string;
}

interface Props {
  contract: ContractData;
  customer: CustomerData;
}

export default function ContractTemplate({ contract, customer }: Props) {
  
  const clauses = contract.content?.clauses || [];
  
  // Tarih Formatla
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("tr-TR");

  return (
    <div className="contract-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        @page { size: A4; margin: 20mm; }
        @media print { 
            body { background: white; -webkit-print-color-adjust: exact; } 
            .page-break { page-break-inside: avoid; }
        }

        .contract-container {
            font-family: 'Inter', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #111827;
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 40px; /* Ekranda rahat görünsün diye */
        }

        h1.contract-title {
            font-size: 18pt;
            text-align: center;
            text-transform: uppercase;
            margin-bottom: 40px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            font-weight: 700;
            letter-spacing: 1px;
        }

        h2.clause-title {
            font-size: 12pt;
            text-transform: uppercase;
            background: #F3F4F6;
            padding: 10px;
            margin-top: 25px;
            margin-bottom: 15px;
            border-left: 4px solid #2563EB;
            font-weight: 700;
            page-break-after: avoid;
        }

        p { margin-bottom: 12px; text-align: justify; }
        ul { margin-bottom: 12px; padding-left: 25px; }
        li { margin-bottom: 5px; }
        
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            gap: 30px;
        }
        
        .party-box {
            width: 48%;
            border: 1px solid #E5E7EB;
            padding: 20px;
            font-size: 10pt;
            background: #F9FAFB;
            border-radius: 8px;
        }
        
        .party-header { 
            font-weight: 800; 
            margin-bottom: 10px; 
            text-transform: uppercase; 
            color: #2563EB; 
            font-size: 9pt;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 5px;
        }

        .info-row { margin-bottom: 4px; }
        .info-label { font-weight: 600; color: #4B5563; margin-right: 5px; }
        
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
        }
        
        .sign-box {
            width: 40%;
            border-top: 1px solid #000;
            padding-top: 15px;
            text-align: center;
        }
        
        .sign-title { font-weight: 800; margin-bottom: 50px; text-transform: uppercase; font-size: 10pt; }
        
        .footer {
            margin-top: 60px;
            font-size: 8pt;
            text-align: center;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 15px;
        }
      `}</style>

      <h1 className="contract-title">Web Yazılım Hizmet ve Gizlilik Sözleşmesi</h1>

      <div className="parties">
        {/* YÜKLENİCİ */}
        <div className="party-box">
            <div className="party-header">YÜKLENİCİ (HİZMET SAĞLAYICI)</div>
            <div className="text-lg font-bold mb-2">Ünal İsi (unalisi.dev)</div>
            <div className="info-row"><span className="info-label">Unvan:</span> Bilgisayar Mühendisi</div>
            <div className="info-row"><span className="info-label">Tel:</span> 0507 706 7726</div>
            <div className="info-row"><span className="info-label">E-posta:</span> sales@unalisi.dev</div>
            <div className="info-row"><span className="info-label">Web:</span> https://unalisi.dev</div>
        </div>

        {/* MÜŞTERİ */}
        <div className="party-box">
            <div className="party-header">MÜŞTERİ (HİZMET ALAN)</div>
            <div className="text-lg font-bold mb-2">{customer.company_name}</div>
            <div className="info-row"><span className="info-label">Yetkili:</span> {customer.contact_person || '-'}</div>
            <div className="info-row"><span className="info-label">Tel:</span> {customer.phone || '-'}</div>
            <div className="info-row"><span className="info-label">Vergi D.:</span> {customer.tax_office || '-'}</div>
            <div className="info-row"><span className="info-label">Vergi No:</span> {customer.tax_number || '-'}</div>
            <div className="info-row"><span className="info-label">Adres:</span> {customer.address || '-'}</div>
        </div>
      </div>

      {/* MADDELER (DİNAMİK) */}
      <div className="clauses">
          {clauses.map((clause, index) => (
              <div key={index} className="page-break">
                  <h2 className="clause-title">{clause.title}</h2>
                  {/* HTML İçeriği Güvenli Basma */}
                  <div 
                    dangerouslySetInnerHTML={{ __html: clause.content }} 
                    className="text-justify text-sm leading-relaxed"
                  />
              </div>
          ))}
      </div>

      {/* İMZA ALANI */}
      <div className="signature-section">
          <div className="sign-box">
              <div className="sign-title">MÜŞTERİ (ONAY)</div>
              <p className="text-sm text-gray-500 mb-10">[İmza / Kaşe]</p>
              <div className="text-xs">Tarih: ..... / ..... / 2025</div>
          </div>
          <div className="sign-box">
              <div className="sign-title">YÜKLENİCİ (ÜNAL İSİ)</div>
              <p className="text-sm text-gray-500 mb-10">[İmza]</p>
              <div className="text-xs">Tarih: {formatDate(contract.created_at)}</div>
          </div>
      </div>

      <div className="footer">
          Bu belge <b>unalisi.dev</b> tarafından hazırlanmıştır | İzinsiz kopyalanması yasaktır. | Sözleşme No: {contract.contract_no}
      </div>
    </div>
  );
}