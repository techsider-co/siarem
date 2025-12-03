"use client";

import { useState, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Settings,
  Users,
  Crown,
  Shield,
  User,
  Eye,
  RefreshCw,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link, useRouter } from "@/navigation";
import { canCreateOrganization, getOrganizationLimit, getOrganizationLimitPrompt } from "@/utils/limits";

// Rol badge'leri
const RoleBadge = ({ role }: { role: string }) => {
  const roleConfig: Record<string, { icon: any; label: string; className: string }> = {
    owner: {
      icon: Crown,
      label: "Sahip",
      className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    },
    admin: {
      icon: Shield,
      label: "Yönetici",
      className: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700",
    },
    member: {
      icon: User,
      label: "Üye",
      className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
    },
    viewer: {
      icon: Eye,
      label: "İzleyici",
      className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700",
    },
  };

  const config = roleConfig[role] || roleConfig.member;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Plan badge'leri
const PlanBadge = ({ plan }: { plan: string }) => {
  const planConfig: Record<string, { label: string; className: string }> = {
    free: {
      label: "Ücretsiz",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
    starter: {
      label: "Starter",
      className: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    pro: {
      label: "Pro",
      className: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    },
    enterprise: {
      label: "Enterprise",
      className: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
  };

  const config = planConfig[plan] || planConfig.free;

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export function OrganizationSwitcher() {
  const supabase = createClient();
  const router = useRouter();
  const { currentOrg, userRole, organizations, isLoading, switchOrganization, refreshOrganizations } = useOrganization();
  const [open, setOpen] = useState(false);
  
  // Yeni organizasyon dialog state'leri
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgForm, setNewOrgForm] = useState({
    name: "",
    slug: "",
  });
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Calculate organization limit status
  const orgLimitStatus = useMemo(() => {
    // Count organizations where user is owner
    const ownedOrgsCount = organizations.filter(org => org.owner_id === currentOrg?.owner_id).length;
    const currentPlan = currentOrg?.subscription_plan || 'free';
    const canCreate = canCreateOrganization(currentPlan, ownedOrgsCount);
    const limit = getOrganizationLimit(currentPlan);
    
    return {
      canCreate,
      ownedOrgsCount,
      limit,
      isUnlimited: limit === -1,
    };
  }, [organizations, currentOrg]);

  // Slug formatla (sadece küçük harf, sayı ve tire)
  const handleSlugChange = (value: string) => {
    const formatted = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    setNewOrgForm(prev => ({ ...prev, slug: formatted }));
    
    // Slug benzersizlik kontrolü
    if (formatted.length >= 3) {
      checkSlugAvailability(formatted);
    } else {
      setSlugAvailable(null);
    }
  };

  // İsimden otomatik slug oluştur
  const generateSlugFromName = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    
    setNewOrgForm(prev => ({ ...prev, slug }));
    
    if (slug.length >= 3) {
      checkSlugAvailability(slug);
    }
  };

  // Slug benzersizlik kontrolü
  const checkSlugAvailability = async (slug: string) => {
    setCheckingSlug(true);
    
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();
    
    setSlugAvailable(!data);
    setCheckingSlug(false);
  };

  // Yeni organizasyon oluştur
  const handleCreateOrganization = async () => {
    console.log("handleCreateOrganization çağrıldı", { newOrgForm, slugAvailable });

    // CHECK ORGANIZATION LIMIT FIRST
    if (!orgLimitStatus.canCreate) {
      const prompt = getOrganizationLimitPrompt(currentOrg?.subscription_plan || 'free');
      toast.error(prompt.description, {
        action: {
          label: "Planı Yükselt",
          onClick: () => router.push("/settings/organization"),
        },
      });
      setCreateDialogOpen(false);
      return;
    }
    
    if (!newOrgForm.name.trim() || !newOrgForm.slug.trim()) {
      toast.error("Organizasyon adı ve URL kısayolu zorunludur");
      return;
    }

    if (newOrgForm.slug.length < 3) {
      toast.error("URL kısayolu en az 3 karakter olmalıdır");
      return;
    }

    // Slug kontrolü henüz yapılmadıysa yap
    if (slugAvailable === null) {
      setCheckingSlug(true);
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", newOrgForm.slug.toLowerCase())
        .single();
      
      if (data) {
        toast.error("Bu URL kısayolu zaten kullanılıyor");
        setSlugAvailable(false);
        setCheckingSlug(false);
        return;
      }
      setSlugAvailable(true);
      setCheckingSlug(false);
    } else if (slugAvailable === false) {
      toast.error("Bu URL kısayolu zaten kullanılıyor");
      return;
    }

    setCreating(true);

    try {
      // 1. Mevcut kullanıcıyı al
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("Kullanıcı bilgisi:", { user, authError });
      
      if (!user) {
        toast.error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        setCreating(false);
        return;
      }

      // 2. Yeni organizasyon oluştur
      console.log("Organizasyon oluşturuluyor...", {
        name: newOrgForm.name.trim(),
        slug: newOrgForm.slug.toLowerCase(),
        owner_id: user.id,
      });
      
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: newOrgForm.name.trim(),
          slug: newOrgForm.slug.toLowerCase(),
          owner_id: user.id,
        })
        .select()
        .single();

      console.log("Organizasyon insert sonucu:", { newOrg, orgError });

      if (orgError) {
        console.error("Organizasyon oluşturma hatası:", orgError);
        toast.error("Organizasyon oluşturulamadı: " + orgError.message);
        setCreating(false);
        return;
      }

      // 3. Kullanıcıyı owner olarak ekle
      console.log("Üye ekleniyor...");
      const { error: memberError } = await supabase
        .from("org_members")
        .insert({
          organization_id: newOrg.id,
          user_id: user.id,
          role: "owner",
          status: "active",
          accepted_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error("Member ekleme hatası:", memberError);
        toast.error("Üye eklenirken hata oluştu: " + memberError.message);
      }

      // 4. Profili güncelle (aktif organizasyonu değiştir)
      console.log("Profil güncelleniyor...");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ current_organization_id: newOrg.id })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profil güncelleme hatası:", profileError);
      }

      // 5. Context'i yenile
      console.log("Context yenileniyor...");
      await refreshOrganizations();

      toast.success("Yeni organizasyon oluşturuldu! 🎉");
      setCreateDialogOpen(false);
      setNewOrgForm({ name: "", slug: "" });
      setSlugAvailable(null);
    } catch (error) {
      console.error("Organizasyon oluşturma hatası:", error);
      toast.error("Beklenmeyen bir hata oluştu");
    }

    setCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Organizasyon Oluştur
        </Button>

        {/* Yeni Organizasyon Oluşturma Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Yeni Organizasyon Oluştur
              </DialogTitle>
              <DialogDescription>
                Yeni bir workspace oluşturun ve ekibinizi davet edin.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Organizasyon Adı */}
              <div className="space-y-2">
                <Label>
                  Organizasyon Adı <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Örn: Unalisi Technologies"
                  value={newOrgForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setNewOrgForm(prev => ({ ...prev, name: newName }));
                    generateSlugFromName(newName);
                  }}
                  className="bg-muted/50 border-border"
                />
              </div>

              {/* URL Kısayolu */}
              <div className="space-y-2">
                <Label>
                  URL Kısayolu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="unalisi-tech"
                    value={newOrgForm.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="bg-muted/50 border-border pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingSlug && (
                      <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {!checkingSlug && slugAvailable === true && newOrgForm.slug.length >= 3 && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <span className="text-red-500 text-xs">Kullanılıyor</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sadece küçük harf, rakam ve tire kullanılabilir (min. 3 karakter)
                </p>
              </div>

              {/* Bilgi Kutusu */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <p className="font-medium mb-1">🚀 Yeni organizasyon oluşturduğunuzda:</p>
                <ul className="text-xs space-y-1 opacity-80">
                  <li>• Otomatik olarak <strong>Sahip</strong> rolü ile eklenirsiniz</li>
                  <li>• Yeni workspace'e hemen geçiş yapılır</li>
                  <li>• Ekip üyelerini daha sonra davet edebilirsiniz</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setNewOrgForm({ name: "", slug: "" });
                  setSlugAvailable(null);
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={!newOrgForm.name.trim() || !newOrgForm.slug.trim() || newOrgForm.slug.length < 3 || slugAvailable !== true || checkingSlug || creating}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Oluştur
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 p-3 h-auto rounded-xl hover:bg-muted/80 transition-all group"
        >
          {/* Org Logo veya Avatar */}
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
            {currentOrg.logo_url ? (
              <img
                src={currentOrg.logo_url}
                alt={currentOrg.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              currentOrg.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Org Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="font-semibold text-foreground truncate">
              {currentOrg.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <PlanBadge plan={currentOrg.subscription_plan} />
              {userRole && <RoleBadge role={userRole} />}
            </div>
          </div>

          <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 bg-popover border-border"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Organizasyonlarım
        </DropdownMenuLabel>

        {/* Org Listesi */}
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => {
              switchOrganization(org.id);
              setOpen(false);
            }}
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent focus:bg-accent"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center text-white font-semibold text-sm">
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                org.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{org.name}</div>
              <div className="text-xs text-muted-foreground">{org.slug}</div>
            </div>
            {currentOrg?.id === org.id && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-border" />

        {/* Yönetim Linkleri */}
        <Link href="/settings/organization">
          <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
            <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>Organizasyon Ayarları</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/settings/team">
          <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
            <Users className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>Ekip Yönetimi</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator className="bg-border" />

        {/* Yeni Org Oluştur */}
        {orgLimitStatus.canCreate ? (
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-accent focus:bg-accent text-primary"
            onClick={() => {
              setOpen(false);
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Yeni Organizasyon</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-accent focus:bg-accent text-muted-foreground"
            onClick={() => {
              setOpen(false);
              router.push("/settings/organization");
            }}
          >
            <Lock className="w-4 h-4 mr-2" />
            <span>Yeni Organizasyon</span>
            <Badge variant="secondary" className="ml-auto text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Sparkles className="w-3 h-3 mr-1" />
              Yükselt
            </Badge>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Yeni Organizasyon Oluşturma Dialog */}
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Yeni Organizasyon Oluştur
          </DialogTitle>
          <DialogDescription>
            Yeni bir workspace oluşturun ve ekibinizi davet edin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Organizasyon Adı */}
          <div className="space-y-2">
            <Label>
              Organizasyon Adı <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Örn: Unalisi Technologies"
              value={newOrgForm.name}
              onChange={(e) => {
                const newName = e.target.value;
                setNewOrgForm(prev => ({ ...prev, name: newName }));
                // İsimden otomatik slug oluştur
                generateSlugFromName(newName);
              }}
              className="bg-muted/50 border-border"
            />
          </div>

          {/* URL Kısayolu */}
          <div className="space-y-2">
            <Label>
              URL Kısayolu <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                placeholder="unalisi-tech"
                value={newOrgForm.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="bg-muted/50 border-border pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingSlug && (
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {!checkingSlug && slugAvailable === true && newOrgForm.slug.length >= 3 && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {!checkingSlug && slugAvailable === false && (
                  <span className="text-red-500 text-xs">Kullanılıyor</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Sadece küçük harf, rakam ve tire kullanılabilir (min. 3 karakter)
            </p>
          </div>

          {/* Bilgi Kutusu */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <p className="font-medium mb-1">🚀 Yeni organizasyon oluşturduğunuzda:</p>
            <ul className="text-xs space-y-1 opacity-80">
              <li>• Otomatik olarak <strong>Sahip</strong> rolü ile eklenirsiniz</li>
              <li>• Yeni workspace'e hemen geçiş yapılır</li>
              <li>• Ekip üyelerini daha sonra davet edebilirsiniz</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setCreateDialogOpen(false);
              setNewOrgForm({ name: "", slug: "" });
              setSlugAvailable(null);
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleCreateOrganization}
            disabled={!newOrgForm.name.trim() || !newOrgForm.slug.trim() || newOrgForm.slug.length < 3 || slugAvailable !== true || checkingSlug || creating}
            className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Oluştur
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

