"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOrganization, canEditData, canDeleteData } from "@/contexts/OrganizationContext";
import { Customer } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Trash2,
  Users,
  MapPin,
  Receipt,
  FilePenLine,
  Save,
  Info,
  Globe,
  Building,
  Archive,
  RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function CustomersPage() {
  const supabase = createClient();
  const { currentOrg, userRole } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- STATE'LER ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    tax_office: "",
    tax_number: "",
    sector_code: "",
  });

  const [editFormData, setEditFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    tax_office: "",
    tax_number: "",
    sector_code: "",
  });

  // VERİ ÇEKME
  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("is_archived", false) // Sadece aktifleri getir
      .order("created_at", { ascending: false });

    if (error) toast.error("Hata oluştu.");
    else setCustomers((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // CREATE
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name) {
      toast.warning("Firma Adı zorunludur.");
      return;
    }
    if (!currentOrg) {
      toast.error("Organizasyon bulunamadı.");
      return;
    }
    const { error } = await supabase.from("customers").insert([{
      ...formData,
      organization_id: currentOrg.id
    }]);
    if (error) toast.error("Hata: " + error.message);
    else {
      toast.success("Müşteri eklendi! 🪐");
      setIsCreateOpen(false);
      setFormData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        district: "",
        tax_office: "",
        tax_number: "",
        sector_code: "",
      });
      fetchCustomers();
    }
  };

  // EDIT HAZIRLIK
  const openEditModal = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setCurrentCustomer(customer);
    setEditFormData({
      company_name: customer.company_name || "",
      contact_person: customer.contact_person || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      district: customer.district || "",
      tax_office: customer.tax_office || "",
      tax_number: customer.tax_number || "",
      sector_code: customer.sector_code || "",
    });
    setIsEditOpen(true);
  };

  // UPDATE
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const { error } = await supabase
      .from("customers")
      .update(editFormData)
      .eq("id", currentCustomer.id);
    if (error) toast.error("Güncelleme başarısız.");
    else {
      toast.success("Güncellendi! ✅");
      setIsEditOpen(false);
      fetchCustomers();
    }
  };

  // --- ARŞİVLEME (SOFT DELETE) ---
  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("customers")
      .update({ is_archived: true })
      .eq("id", id);
    if (error) toast.error("Arşivlenemedi.");
    else {
      toast.success("Müşteri arşive kaldırıldı. 🗄️");
      fetchCustomers();
    }
  };

  // --- KALICI SİLME (HARD DELETE - CASCADE) ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (
      !confirm(
        "⚠️ DİKKAT: Bu müşteriyi silerseniz, ona bağlı TÜM TEKLİFLER ve FİNANSAL GEÇMİŞ (Gelir/Gider) kalıcı olarak silinecektir.\n\nDevam etmek istiyor musunuz?"
      )
    )
      return;

    // Yükleniyor efekti verilebilir ama şimdilik toast ile idare edelim
    const toastId = toast.loading("Veriler temizleniyor...");

    try {
      // 1. Önce bağlı teklifleri bul
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id")
        .eq("customer_id", id);
      const proposalIds = proposals?.map((p) => p.id) || [];

      // 2. Varsa finans kayıtlarını sil
      if (proposalIds.length > 0) {
        await supabase
          .from("transactions")
          .delete()
          .in("proposal_id", proposalIds);
        await supabase.from("proposals").delete().eq("customer_id", id);
      }

      // 3. Müşteriyi sil
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success("Müşteri ve verileri kalıcı olarak silindi.");
      fetchCustomers();
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error("Hata: " + error.message);
    }
  };

  const handleRowClick = (customer: Customer) => {
    setViewCustomer(customer);
    setIsViewOpen(true);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Müşteri Veritabanı
          </h1>
          <p className="text-muted-foreground mt-1">Aktif müşteri listesi.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          {canEditData(userRole) && (
            <DialogTrigger asChild>
              <Button className="bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground border-0 shadow-lg shadow-primary/25">
                <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-[700px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Yeni Müşteri Kaydı</DialogTitle>
              <DialogDescription>Bilgileri giriniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firma Adı *</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sektör</Label>
                  <Select
                    onValueChange={(val) =>
                      setFormData({ ...formData, sector_code: val })
                    }
                  >
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="ARC">Mimarlık</SelectItem>
                      <SelectItem value="COR">Kurumsal</SelectItem>
                      <SelectItem value="ECO">E-Ticaret</SelectItem>
                      <SelectItem value="HLT">Sağlık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yetkili</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_person: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-Posta</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  className="bg-muted/50 border-border"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>İl</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>İlçe</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vergi Dairesi</Label>
                  <Input
                    className="bg-background border-border"
                    value={formData.tax_office}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_office: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vergi No</Label>
                  <Input
                    className="bg-background border-border"
                    value={formData.tax_number}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_number: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  className="bg-muted/50 border-border"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                Kaydet
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT MODAL (Kısaltıldı, mantık aynı) */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[700px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Düzenle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firma Adı</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={editFormData.company_name}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        company_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sektör</Label>
                  <Select
                    value={editFormData.sector_code}
                    onValueChange={(val) =>
                      setEditFormData({ ...editFormData, sector_code: val })
                    }
                  >
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="ARC">Mimarlık</SelectItem>
                      <SelectItem value="COR">Kurumsal</SelectItem>
                      <SelectItem value="ECO">E-Ticaret</SelectItem>
                      <SelectItem value="HLT">Sağlık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Yetkili</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={editFormData.contact_person}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        contact_person: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-Posta</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  className="bg-muted/50 border-border"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                />
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vergi Dairesi</Label>
                  <Input
                    className="bg-background border-border"
                    value={editFormData.tax_office}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        tax_office: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vergi No</Label>
                  <Input
                    className="bg-background border-border"
                    value={editFormData.tax_number}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        tax_number: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>İl</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={editFormData.city}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>İlçe</Label>
                  <Input
                    className="bg-muted/50 border-border"
                    value={editFormData.district}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        district: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  className="bg-muted/50 border-border"
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <Button type="submit" className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                Güncelle
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* VIEW MODAL (Aynı Kaldı) */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[600px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <Info className="w-5 h-5 text-secondary" /> Müşteri Profili
              </DialogTitle>
            </DialogHeader>
            {viewCustomer && (
              <div className="space-y-6 py-2">
                <div className="bg-muted/50 p-4 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {viewCustomer.company_name}
                    </h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1">
                      <Users className="w-3 h-3" />{" "}
                      {viewCustomer.contact_person}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary">
                      {viewCustomer.sector_code || "GENEL"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                      İletişim
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Mail className="w-4 h-4 text-muted-foreground" />{" "}
                        {viewCustomer.email || "-"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Phone className="w-4 h-4 text-muted-foreground" />{" "}
                        {viewCustomer.phone || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                      Resmi
                    </h4>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-2">
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Building className="w-4 h-4 text-primary" />{" "}
                        {viewCustomer.tax_office
                          ? `${viewCustomer.tax_office} VD.`
                          : "-"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground/80 font-mono">
                        <Receipt className="w-4 h-4 text-primary" />{" "}
                        {viewCustomer.tax_number || "-"}
                      </div>
                    </div>
                  </div>
                </div>
                <Separator className="bg-border" />
                <div>
                  <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2">
                    Konum
                  </h4>
                  <div className="flex items-start gap-2 text-sm text-foreground/80">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />{" "}
                    <div>
                      <span className="font-semibold text-foreground">
                        {viewCustomer.district} / {viewCustomer.city}
                      </span>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {viewCustomer.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Ara..."
          className="pl-10 bg-muted/30 border-border focus:border-primary h-10 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-2xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm shadow-md">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-slate-900/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Firma</TableHead>
              <TableHead className="text-muted-foreground">İletişim</TableHead>
              <TableHead className="text-muted-foreground">Vergi</TableHead>
              <TableHead className="text-muted-foreground">Konum</TableHead>
              <TableHead className="text-muted-foreground text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-muted-foreground"
                >
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-muted-foreground"
                >
                  Kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => (
                <TableRow
                  key={c.id}
                  className="border-border hover:bg-muted/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(c)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {c.company_name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-6">
                        {c.contact_person}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-2">
                          <Mail className="w-3 h-3" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {c.tax_office && (
                        <div className="text-foreground/80">{c.tax_office}</div>
                      )}
                      {c.tax_number && (
                        <div className="font-mono text-muted-foreground">
                          {c.tax_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-3 h-3" />{" "}
                      {c.district && c.city
                        ? `${c.district} / ${c.city}`
                        : c.address?.slice(0, 20) + "..."}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Düzenleme butonu - sadece edit yetkisi olanlar */}
                      {canEditData(userRole) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openEditModal(e, c)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <FilePenLine className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Arşiv ve Silme - sadece admin/owner */}
                      {canDeleteData(userRole) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleArchive(e, c.id)}
                            className="text-muted-foreground hover:text-orange-500"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(e, c.id)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
