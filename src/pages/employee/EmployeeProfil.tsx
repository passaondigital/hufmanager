import { useEmployeeProfile } from "@/hooks/useEmployees";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const EmployeeProfil = () => {
  const { signOut } = useAuth();
  const { data: profile } = useEmployeeProfile();

  if (!profile) return null;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const roleLabel = profile.role === "team_lead" ? "Teamleiter" : profile.role === "employee" ? "Mitarbeiter" : "Assistent";
  const statusLabel = {
    active: "Aktiv",
    sick: "Krank",
    vacation: "Urlaub",
    suspended: "Gesperrt",
    inactive: "Inaktiv",
  }[profile.status] || profile.status;

  const permissions = [
    { label: "Alleine arbeiten", value: profile.can_work_alone },
    { label: "Hufschutz anbringen", value: profile.can_apply_hoof_protection },
    { label: "Sensible Kunden", value: profile.can_work_sensitive_clients },
  ];

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Mein Profil</h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{profile.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{roleLabel}</Badge>
                <Badge variant={profile.status === "active" ? "default" : "outline"}>
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{profile.employment_type === "contractor" ? "Selbstständig" : "Angestellt"}</span>
            </div>
            {profile.contract_start_date && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Seit {format(new Date(profile.contract_start_date), "dd.MM.yyyy", { locale: de })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Berechtigungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {permissions.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              {p.value ? (
                <CheckCircle className="h-4 w-4 text-primary" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full gap-2" onClick={() => signOut()}>
        <LogOut className="h-4 w-4" />
        Abmelden
      </Button>
    </div>
  );
};

export default EmployeeProfil;
