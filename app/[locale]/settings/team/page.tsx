"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOrganization, canManageMembers } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole, MemberStatus } from "@/types";

interface TeamMember {
  id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  invited_at: string;
  accepted_at: string | null;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

const roleConfig: Record<UserRole, { icon: any; label: string; color: string }> = {
  owner: { icon: Crown, label: "Sahip", color: "text-amber-500" },
  admin: { icon: Shield, label: "Yönetici", color: "text-purple-500" },
  member: { icon: User, label: "Üye", color: "text-blue-500" },
  viewer: { icon: Eye, label: "İzleyici", color: "text-gray-500" },
};

const statusConfig: Record<MemberStatus, { label: string; className: string }> = {
  active: {
    label: "Aktif",
    className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  },
  pending: {
    label: "Bekliyor",
    className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  deactivated: {
    label: "Pasif",
    className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

export default function TeamPage() {
  const supabase = createClient();
  const { currentOrg, userRole } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const canManage = canManageMembers(userRole);

  // Mevcut kullanıcı ID'sini al
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Üyeleri çek
  const fetchMembers = async () => {
    if (!currentOrg) return;

    setLoading(true);
    
    // Önce org_members'ı çek
    const { data: membersData, error: membersError } = await supabase
      .from("org_members")
      .select("id, user_id, role, status, invited_at, accepted_at")
      .eq("organization_id", currentOrg.id)
      .order("role", { ascending: true });

    if (membersError) {
      console.error("Members fetch error:", membersError);
      toast.error("Üyeler yüklenemedi");
      setLoading(false);
      return;
    }

    // Sonra her üye için profile bilgisini çek
    const membersWithProfiles = await Promise.all(
      (membersData || []).map(async (member) => {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", member.user_id)
          .maybeSingle();
        
        if (profileError) {
          console.warn("Profile fetch warning:", profileError.message);
        }
        
        return {
          ...member,
          profiles: profileData || { full_name: null, email: null, avatar_url: null },
        };
      })
    );

    setMembers(membersWithProfiles as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [currentOrg?.id]);

  // Üye davet et
  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail) return;

    setInviting(true);

    // Email'e göre kullanıcıyı bul (.maybeSingle() 406 hatasını önler)
    const { data: existingUser, error: userError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", inviteEmail.toLowerCase().trim())
      .maybeSingle();

    if (userError) {
      console.error("User search error:", userError);
      toast.error("Kullanıcı araması sırasında bir hata oluştu.");
      setInviting(false);
      return;
    }

    if (!existingUser) {
      toast.error(
        "Bu e-posta ile kayıtlı kullanıcı bulunamadı. Kullanıcının önce sisteme kayıt olması gerekmektedir.",
        {
          duration: 5000,
          description: "Davet edeceğiniz kişiden sisteme kayıt olmasını isteyin, ardından tekrar deneyin.",
        }
      );
      setInviting(false);
      return;
    }

    // Zaten üye mi kontrol et
    const { data: existingMember } = await supabase
      .from("org_members")
      .select("id")
      .eq("organization_id", currentOrg.id)
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingMember) {
      toast.error("Bu kullanıcı zaten bu organizasyonda üye.");
      setInviting(false);
      return;
    }

    // Üye olarak ekle
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("org_members").insert({
      organization_id: currentOrg.id,
      user_id: existingUser.id,
      role: inviteRole,
      status: "pending",
      invited_by: user?.id,
    });

    if (error) {
      toast.error("Davet gönderilemedi: " + error.message);
    } else {
      toast.success(`${inviteEmail} adresine davet gönderildi!`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      fetchMembers();
    }

    setInviting(false);
  };

  // Rol değiştir
  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from("org_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast.error("Rol güncellenemedi");
    } else {
      toast.success("Rol güncellendi");
      fetchMembers();
    }
  };

  // Üyeyi çıkar
  const handleRemoveMember = async (memberId: string, memberRole: UserRole) => {
    if (memberRole === "owner") {
      toast.error("Organizasyon sahibi çıkarılamaz!");
      return;
    }

    if (!confirm("Bu üyeyi organizasyondan çıkarmak istediğinize emin misiniz?")) {
      return;
    }

    const { error } = await supabase.from("org_members").delete().eq("id", memberId);

    if (error) {
      toast.error("Üye çıkarılamadı");
    } else {
      toast.success("Üye organizasyondan çıkarıldı");
      fetchMembers();
    }
  };

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Organizasyon seçilmedi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Ekip Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentOrg.name} organizasyonunun üyelerini yönetin.
          </p>
        </div>

        {canManage && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/25">
                <UserPlus className="mr-2 h-4 w-4" />
                Üye Davet Et
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Yeni Üye Davet Et
                </DialogTitle>
                <DialogDescription>
                  Organizasyonunuza yeni bir üye ekleyin.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Önemli Uyarı ve Kayıt Linki */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Önemli Not</p>
                      <p className="text-xs opacity-80 mt-1">
                        Davet edeceğiniz kullanıcının sistemde kayıtlı olması gerekmektedir.
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded flex-1 truncate">
                          {typeof window !== 'undefined' ? `${window.location.origin}/tr/kayit-ol` : '/kayit-ol'}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/tr/kayit-ol`);
                            toast.success("Kayıt linki kopyalandı!");
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Kopyala
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-posta Adresi</Label>
                  <Input
                    type="email"
                    placeholder="ornek@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-muted/50 border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sistemde kayıtlı bir kullanıcının e-posta adresini girin.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as UserRole)}
                  >
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-500" />
                          Yönetici
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          Üye
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          İzleyici
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <p className="font-medium mb-1">Rol Yetkileri:</p>
                  <ul className="text-xs space-y-1 opacity-80">
                    <li>• <strong>Yönetici:</strong> Üye ekleyebilir, verileri yönetebilir</li>
                    <li>• <strong>Üye:</strong> Teklif/Müşteri oluşturabilir, düzenleyebilir</li>
                    <li>• <strong>İzleyici:</strong> Sadece görüntüleme yapabilir</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviting}
                  className="bg-primary"
                >
                  {inviting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Davet Gönder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* ÜYE LİSTESİ */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-muted/50 dark:bg-slate-900/30">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Üye
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Rol
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Durum
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                Katılım
              </TableHead>
              {canManage && (
                <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-semibold text-right">
                  İşlemler
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Henüz üye yok.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const role = roleConfig[member.role];
                const status = statusConfig[member.status];
                const RoleIcon = role.icon;

                return (
                  <TableRow
                    key={member.id}
                    className="border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                          {member.profiles?.full_name?.charAt(0) ||
                            member.profiles?.email?.charAt(0) ||
                            "?"}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {member.profiles?.full_name || "İsim belirtilmemiş"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.profiles?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RoleIcon className={`w-4 h-4 ${role.color}`} />
                        <span className="font-medium">{role.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.accepted_at
                        ? new Date(member.accepted_at).toLocaleDateString("tr-TR")
                        : "Davet bekliyor"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {/* Owner veya kendisi ise işlem yapılamaz */}
                        {member.role === "owner" ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <Crown className="w-3 h-3 mr-1" />
                            Sahip
                          </Badge>
                        ) : member.user_id === currentUserId ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Siz
                          </Badge>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, "admin")}
                                disabled={member.role === "admin"}
                              >
                                <Shield className="w-4 h-4 mr-2 text-purple-500" />
                                Yönetici Yap
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, "member")}
                                disabled={member.role === "member"}
                              >
                                <User className="w-4 h-4 mr-2 text-blue-500" />
                                Üye Yap
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.id, "viewer")}
                                disabled={member.role === "viewer"}
                              >
                                <Eye className="w-4 h-4 mr-2 text-gray-500" />
                                İzleyici Yap
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(member.id, member.role)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Organizasyondan Çıkar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ROL AÇIKLAMALARI */}
      <div className="grid md:grid-cols-4 gap-4">
        {(Object.entries(roleConfig) as [UserRole, typeof roleConfig.owner][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="p-4 rounded-xl border border-border bg-card/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className="font-semibold">{config.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {key === "owner" && "Tam yetki, organizasyonu yönetir ve silebilir."}
                  {key === "admin" && "Üye yönetimi ve tüm verilere erişim."}
                  {key === "member" && "Teklif, müşteri ve proje oluşturabilir."}
                  {key === "viewer" && "Sadece görüntüleme yetkisi."}
                </p>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

