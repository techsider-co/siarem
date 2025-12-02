"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import {
  Mail,
  Check,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Organization, UserRole } from "@/types";

interface PendingInvitation {
  id: string;
  organization_id: string;
  role: UserRole;
  invited_at: string;
  organization: Organization;
}

const roleLabels: Record<UserRole, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  member: "Üye",
  viewer: "İzleyici",
};

export function PendingInvitations() {
  const supabase = createClient();
  const { refreshOrganizations, switchOrganization } = useOrganization();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const checkInvitations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Önce pending üyelikleri çek
    const { data: pendingMembers, error: membersError } = await supabase
      .from("org_members")
      .select("id, organization_id, role, invited_at")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (membersError || !pendingMembers || pendingMembers.length === 0) {
      return;
    }

    // Sonra her biri için organizasyon bilgisini çek
    const invitationsWithOrgs = await Promise.all(
      pendingMembers.map(async (member) => {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .eq("id", member.organization_id)
          .maybeSingle();

        return {
          id: member.id,
          organization_id: member.organization_id,
          role: member.role as UserRole,
          invited_at: member.invited_at,
          organization: orgData as Organization,
        };
      })
    );

    // Sadece org bilgisi olan davetleri göster
    const validInvitations = invitationsWithOrgs.filter(inv => inv.organization);
    
    if (validInvitations.length > 0) {
      setInvitations(validInvitations);
      setDialogOpen(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkInvitations();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = async (invitation: PendingInvitation) => {
    setProcessing(invitation.id);

    const { error } = await supabase
      .from("org_members")
      .update({
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (error) {
      toast.error("Davet kabul edilemedi: " + error.message);
    } else {
      toast.success(`${invitation.organization.name} organizasyonuna katıldınız!`);
      await refreshOrganizations();
      switchOrganization(invitation.organization.id);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      if (invitations.length === 1) {
        setDialogOpen(false);
      }
    }
    setProcessing(null);
  };

  const handleReject = async (invitation: PendingInvitation) => {
    if (!confirm(`${invitation.organization.name} davetini reddetmek istiyor musunuz?`)) {
      return;
    }
    setProcessing(invitation.id);

    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("id", invitation.id);

    if (error) {
      toast.error("Davet reddedilemedi: " + error.message);
    } else {
      toast.success("Davet reddedildi");
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      if (invitations.length === 1) {
        setDialogOpen(false);
      }
    }
    setProcessing(null);
  };

  if (invitations.length === 0) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Bekleyen Davetler
            <Badge variant="secondary" className="ml-2">{invitations.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Aşağıdaki organizasyonlara davet edildiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {invitations.map((inv) => (
            <div key={inv.id} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                    {inv.organization.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{inv.organization.name}</h4>
                    <p className="text-sm text-muted-foreground">@{inv.organization.slug}</p>
                  </div>
                </div>
                <Badge variant="outline">{roleLabels[inv.role]}</Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Davet: {new Date(inv.invited_at).toLocaleDateString("tr-TR")}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                  onClick={() => handleAccept(inv)}
                  disabled={processing === inv.id}
                >
                  <Check className="w-4 h-4 mr-1" /> Kabul Et
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  onClick={() => handleReject(inv)}
                  disabled={processing === inv.id}
                >
                  <X className="w-4 h-4 mr-1" /> Reddet
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

