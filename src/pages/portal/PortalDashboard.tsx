import { useParams, Navigate } from "react-router-dom";
import { useOrganizationBySlug, useOrgMembership } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalWidgets } from "@/components/portal/PortalWidgets";
import { Loader2 } from "lucide-react";

export default function PortalDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: membership, isLoading: memLoading } = useOrgMembership(org?.id);

  if (authLoading || orgLoading || memLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Portal nicht gefunden</h1>
          <p className="text-sm text-muted-foreground">Die Organisation „{slug}" existiert nicht oder ist deaktiviert.</p>
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Zugang nicht autorisiert</h1>
          <p className="text-sm text-muted-foreground">Du bist kein Mitglied von {org.name}.</p>
        </div>
      </div>
    );
  }

  const basePath = `/portal/${slug}`;

  return (
    <div className="flex min-h-screen bg-background">
      <PortalSidebar org={org} basePath={basePath} />
      <main className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Willkommen im {org.name} Portal</p>
        </div>
        <PortalWidgets orgId={org.id} orgType={org.type || "other"} />

        {/* TODO: Add recent activity list, charts per org type */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-2">Letzte Aktivitäten</h2>
          <p className="text-sm text-muted-foreground">Hier erscheinen bald die neuesten Ereignisse in deinem Portal.</p>
        </div>
      </main>
    </div>
  );
}
