import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Hammer,
  Heart,
  Users,
  Stethoscope,
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Monitor,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { DEMO_EMAILS } from "@/lib/demo-accounts";

interface DemoAccountInfo {
  email: string;
  label: string;
  icon: React.ElementType;
  expectedRole: string;
  readableIdPrefix: string;
  // From DB
  profileId: string | null;
  fullName: string | null;
  readableId: string | null;
  role: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
  exists: boolean;
  hasCorrectRole: boolean;
}

const ACCOUNT_CONFIGS = [
  { email: DEMO_EMAILS.provider, label: "Hufbearbeiter", icon: Hammer, expectedRole: "provider", readableIdPrefix: "PID-DEMO" },
  { email: DEMO_EMAILS.client, label: "Pferdebesitzer", icon: Heart, expectedRole: "client", readableIdPrefix: "KID-DEMO" },
  { email: DEMO_EMAILS.employee, label: "Mitarbeiter", icon: Users, expectedRole: "employee", readableIdPrefix: "EMP-DEMO" },
  { email: DEMO_EMAILS.partner, label: "Fachpartner", icon: Stethoscope, expectedRole: "partner", readableIdPrefix: "PRID-DEMO" },
];

export function DemoAccountsManager() {
  const queryClient = useQueryClient();
  
  const { data: accounts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["demo-accounts-status"],
    queryFn: async () => {
      const emails = Object.values(DEMO_EMAILS);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, readable_id, created_at")
        .in("email", emails);

      const profileIds = profiles?.map(p => p.id) || [];
      const { data: roles } = profileIds.length > 0
        ? await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", profileIds)
        : { data: [] };

      const { data: activityCounts } = await supabase
        .from("demo_activity_logs")
        .select("user_email, id")
        .order("created_at", { ascending: false });

      const result: DemoAccountInfo[] = ACCOUNT_CONFIGS.map(config => {
        const profile = profiles?.find(p => p.email?.toLowerCase() === config.email.toLowerCase());
        const role = roles?.find(r => r.user_id === profile?.id);

        return {
          ...config,
          profileId: profile?.id || null,
          fullName: profile?.full_name || null,
          readableId: profile?.readable_id || null,
          role: role?.role || null,
          createdAt: profile?.created_at || null,
          lastSignIn: null,
          exists: !!profile,
          hasCorrectRole: role?.role === config.expectedRole,
        };
      });

      return result;
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("setup-demo-accounts", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Demo-Accounts eingerichtet: ${data?.results?.filter((r: any) => r.status === "ok").length}/4 erfolgreich`);
      queryClient.invalidateQueries({ queryKey: ["demo-accounts-status"] });
    },
    onError: (err: any) => {
      toast.error(`Fehler: ${err.message}`);
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seed-demo-data", {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Demo-Daten erfolgreich befüllt!");
      queryClient.invalidateQueries({ queryKey: ["demo-accounts-status"] });
    },
    onError: (err: any) => {
      toast.error(`Fehler beim Befüllen: ${err.message}`);
    },
  });

  const allReady = accounts?.every(a => a.exists && a.hasCorrectRole) || false;
  const readyCount = accounts?.filter(a => a.exists && a.hasCorrectRole).length || 0;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Demo-Accounts Übersicht
          </h2>
          <p className="text-sm text-muted-foreground">
            Status aller 4 Demo-Zugänge
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={allReady ? "default" : "destructive"} className="gap-1">
            {allReady ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {readyCount}/4 bereit
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Account Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts?.map((account) => {
              const Icon = account.icon;
              return (
                <Card key={account.email} className={!account.exists ? "border-destructive/50 bg-destructive/5" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${account.exists ? "bg-primary/10" : "bg-destructive/10"}`}>
                        <Icon className={`h-6 w-6 ${account.exists ? "text-primary" : "text-destructive"}`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground">{account.label}</h3>
                          {account.exists ? (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                              <CheckCircle className="h-3 w-3" />
                              Aktiv
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Fehlt
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground truncate">{account.email}</p>
                          {account.exists && (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                {account.readableId && (
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    #{account.readableId}
                                  </Badge>
                                )}
                                <Badge
                                  variant={account.hasCorrectRole ? "outline" : "destructive"}
                                  className="text-xs"
                                >
                                  {account.role || "Keine Rolle"}
                                  {!account.hasCorrectRole && ` (erwartet: ${account.expectedRole})`}
                                </Badge>
                              </div>
                              {account.fullName && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <UserCheck className="h-3 w-3" />
                                  {account.fullName}
                                </p>
                              )}
                              {account.createdAt && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Erstellt {formatDistanceToNow(new Date(account.createdAt), { addSuffix: true, locale: de })}
                                </p>
                              )}
                            </>
                          )}
                          {!account.exists && (
                            <p className="text-xs text-destructive">
                              Account muss in Supabase Auth angelegt werden
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Setup Button */}
          {!allReady && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Fehlende Accounts einrichten</CardTitle>
                <CardDescription>
                  Erstelle die fehlenden Demo-Accounts automatisch per Klick
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rolle</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts?.filter(a => !a.exists || !a.hasCorrectRole).map(account => (
                      <TableRow key={account.email}>
                        <TableCell className="font-medium">{account.label}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{account.email}</code></TableCell>
                        <TableCell>
                          {!account.exists ? (
                            <Badge variant="destructive" className="text-xs">Nicht angelegt</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600">Falsche Rolle</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Passwort für alle Demo-Accounts: <code className="bg-muted px-1 rounded">HufManagerDemo2030</code>
                  </p>
                  <Button 
                    onClick={() => setupMutation.mutate()}
                    disabled={setupMutation.isPending}
                  >
                    {setupMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Einrichten...
                      </>
                    ) : (
                      "Alle 4 Accounts einrichten"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seed Demo Data Button - show when all accounts are ready */}
          {allReady && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Demo-Daten befüllen</h3>
                    <p className="text-sm text-muted-foreground">
                      Alle 4 Accounts mit professionellen Inhalten füllen: Pferde, Termine, Rechnungen, Bewertungen, Inventar, Angebote und mehr.
                    </p>
                  </div>
                  <Button 
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                    variant="outline"
                  >
                    {seedMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Befülle Daten...
                      </>
                    ) : (
                      "Demo-Daten befüllen"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
