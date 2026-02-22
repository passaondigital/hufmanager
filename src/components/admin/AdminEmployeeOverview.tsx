import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Search, RefreshCw, Loader2, Eye, Users, Briefcase, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface EmployeeData {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  provider_id: string;
  provider_name: string | null;
  assignment_count: number;
}

export default function AdminEmployeeOverview() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch all employee profiles
      const { data: empProfiles, error } = await supabase
        .from("employee_profiles")
        .select("id, user_id, full_name, email, role, status, created_at, provider_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const providerIds = [...new Set(empProfiles?.map(e => e.provider_id) || [])];

      // Fetch provider names
      const { data: providers } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", providerIds);

      const providerMap = new Map(providers?.map(p => [p.id, p.full_name]) || []);

      // Fetch assignment counts
      const { data: assignments } = await supabase
        .from("employee_assignments")
        .select("employee_id");

      const assignmentMap = new Map<string, number>();
      assignments?.forEach(a => assignmentMap.set(a.employee_id, (assignmentMap.get(a.employee_id) || 0) + 1));

      const employeeData: EmployeeData[] = (empProfiles || []).map(e => ({
        id: e.id,
        user_id: e.user_id,
        full_name: e.full_name,
        email: e.email,
        role: e.role,
        status: e.status,
        created_at: e.created_at,
        provider_id: e.provider_id,
        provider_name: providerMap.get(e.provider_id) || null,
        assignment_count: assignmentMap.get(e.id) || 0,
      }));

      setEmployees(employeeData);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Fehler beim Laden der Mitarbeiter");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return employees;
    const s = searchTerm.toLowerCase();
    return employees.filter(e =>
      e.full_name?.toLowerCase().includes(s) ||
      e.email?.toLowerCase().includes(s) ||
      e.provider_name?.toLowerCase().includes(s)
    );
  }, [employees, searchTerm]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="default" className="text-xs bg-green-500">Aktiv</Badge>;
      case "invited": return <Badge variant="secondary" className="text-xs">Eingeladen</Badge>;
      case "suspended": return <Badge variant="destructive" className="text-xs">Gesperrt</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "team_lead": return <Badge variant="outline" className="text-xs border-primary text-primary">Team Lead</Badge>;
      case "employee": return <Badge variant="outline" className="text-xs">Mitarbeiter</Badge>;
      case "assistant": return <Badge variant="outline" className="text-xs">Assistent</Badge>;
      default: return <Badge variant="outline" className="text-xs">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-2xl font-bold">{employees.length}</p>
          <p className="text-xs text-muted-foreground">Mitarbeiter gesamt</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{employees.filter(e => e.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">Aktiv</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{employees.filter(e => e.status === "invited").length}</p>
          <p className="text-xs text-muted-foreground">Eingeladen</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{new Set(employees.map(e => e.provider_id)).size}</p>
          <p className="text-xs text-muted-foreground">Provider</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Mitarbeiter suchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchEmployees}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead className="hidden md:table-cell">Provider</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="hidden md:table-cell">Aufgaben</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(emp => (
              <TableRow key={emp.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email || "—"}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm">{emp.provider_name || "—"}</p>
                </TableCell>
                <TableCell>{roleBadge(emp.role)}</TableCell>
                <TableCell className="hidden md:table-cell">{emp.assignment_count}</TableCell>
                <TableCell>{statusBadge(emp.status)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setSelectedEmployee(emp); setDetailOpen(true); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Keine Mitarbeiter gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-auto">
          <SheetHeader>
            <SheetTitle>{selectedEmployee?.full_name}</SheetTitle>
          </SheetHeader>
          {selectedEmployee && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <p className="text-sm"><span className="text-muted-foreground">E-Mail:</span> {selectedEmployee.email || "—"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Rolle:</span> {selectedEmployee.role}</p>
                <p className="text-sm"><span className="text-muted-foreground">Status:</span> {selectedEmployee.status}</p>
                <p className="text-sm"><span className="text-muted-foreground">Provider:</span> {selectedEmployee.provider_name || "—"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Registriert:</span> {format(new Date(selectedEmployee.created_at), "dd.MM.yyyy", { locale: de })}</p>
                <p className="text-sm"><span className="text-muted-foreground">App verknüpft:</span> {selectedEmployee.user_id ? "Ja" : "Nein"}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 text-center">
                  <Briefcase className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedEmployee.assignment_count}</p>
                  <p className="text-xs text-muted-foreground">Aufgaben</p>
                </Card>
                <Card className="p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedEmployee.role}</p>
                  <p className="text-xs text-muted-foreground">Rolle</p>
                </Card>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
