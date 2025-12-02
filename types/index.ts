export interface Customer {
  id: string;
  created_at: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_office: string | null;
  tax_number: string | null;
  sector_code: string | null;
  logo_url: string | null;
  // YENİ EKLENENLER:
  city: string | null;
  district: string | null;
}