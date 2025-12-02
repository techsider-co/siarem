"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
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
    const { error } = await supabase.from("customers").insert([formData]);
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
          <h1 className="text-3xl font-bold text-white glow-text flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" /> Müşteri Veritabanı
          </h1>
          <p className="text-slate-400 mt-1">Aktif müşteri listesi.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0">
              <Plus className="mr-2 h-4 w-4" /> Yeni Müşteri
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] glass-panel border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Yeni Müşteri Kaydı</DialogTitle>
              <DialogDescription>Bilgileri giriniz.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firma Adı *</Label>
                  <Input
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
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
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                  className="bg-slate-900/50 border-slate-700 text-white"
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
                    className="bg-slate-900/50 border-slate-700 text-white"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>İlçe</Label>
                  <Input
                    className="bg-slate-900/50 border-slate-700 text-white"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vergi Dairesi</Label>
                  <Input
                    className="bg-slate-900 border-slate-600 text-white"
                    value={formData.tax_office}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_office: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vergi No</Label>
                  <Input
                    className="bg-slate-900 border-slate-600 text-white"
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
                  className="bg-slate-900/50 border-slate-700 text-white"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="mt-4 bg-blue-600 text-white">
                Kaydet
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT MODAL (Kısaltıldı, mantık aynı) */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[700px] glass-panel border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Düzenle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firma Adı</Label>
                  <Input
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
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
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                  className="bg-slate-900/50 border-slate-700 text-white"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                />
              </div>
              <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vergi Dairesi</Label>
                  <Input
                    className="bg-slate-900 border-slate-600 text-white"
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
                    className="bg-slate-900 border-slate-600 text-white"
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
                    className="bg-slate-900/50 border-slate-700 text-white"
                    value={editFormData.city}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>İlçe</Label>
                  <Input
                    className="bg-slate-900/50 border-slate-700 text-white"
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
                  className="bg-slate-900/50 border-slate-700 text-white"
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <Button type="submit" className="mt-4 bg-green-600 text-white">
                Güncelle
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* VIEW MODAL (Aynı Kaldı) */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[600px] glass-panel border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" /> Müşteri Profili
              </DialogTitle>
            </DialogHeader>
            {viewCustomer && (
              <div className="space-y-6 py-2">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {viewCustomer.company_name}
                    </h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      <Users className="w-3 h-3" />{" "}
                      {viewCustomer.contact_person}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold bg-slate-800 text-blue-300">
                      {viewCustomer.sector_code || "GENEL"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                      İletişim
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500" />{" "}
                        {viewCustomer.email || "-"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500" />{" "}
                        {viewCustomer.phone || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                      Resmi
                    </h4>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Building className="w-4 h-4 text-blue-500" />{" "}
                        {viewCustomer.tax_office
                          ? `${viewCustomer.tax_office} VD.`
                          : "-"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                        <Receipt className="w-4 h-4 text-blue-500" />{" "}
                        {viewCustomer.tax_number || "-"}
                      </div>
                    </div>
                  </div>
                </div>
                <Separator className="bg-slate-800" />
                <div>
                  <h4 className="text-xs uppercase font-semibold text-slate-500 tracking-wider mb-2">
                    Konum
                  </h4>
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />{" "}
                    <div>
                      <span className="font-semibold text-white">
                        {viewCustomer.district} / {viewCustomer.city}
                      </span>
                      <p className="text-slate-400 mt-1 text-xs">
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
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <Input
          type="search"
          placeholder="Ara..."
          className="pl-10 bg-slate-900/30 border-slate-700 text-white focus:border-blue-500 h-10 rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden neon-border">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Firma</TableHead>
              <TableHead className="text-slate-400">İletişim</TableHead>
              <TableHead className="text-slate-400">Vergi</TableHead>
              <TableHead className="text-slate-400">Konum</TableHead>
              <TableHead className="text-slate-400 text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-slate-500"
                >
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-32 text-slate-500"
                >
                  Kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c) => (
                <TableRow
                  key={c.id}
                  className="border-slate-800 hover:bg-blue-900/10 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(c)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        {c.company_name}
                      </span>
                      <span className="text-xs text-slate-500 ml-6">
                        {c.contact_person}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-slate-400">
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
                    <div className="text-sm text-slate-400">
                      {c.tax_office && (
                        <div className="text-slate-300">{c.tax_office}</div>
                      )}
                      {c.tax_number && (
                        <div className="font-mono text-slate-500">
                          {c.tax_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-600" />{" "}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openEditModal(e, c)}
                        className="text-slate-500 hover:text-blue-400"
                      >
                        <FilePenLine className="h-4 w-4" />
                      </Button>
                      {/* ARŞİV BUTONU */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleArchive(e, c.id)}
                        className="text-slate-500 hover:text-orange-400"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      {/* SİLME BUTONU */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, c.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
