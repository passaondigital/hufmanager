import { useState } from "react";
import { useEmployees, Employee, EmployeeStatus, EmployeeRole } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Edit,
  Trash2,
  Send,
  UserCheck,
  UserX,
  Shield,
  Eye,
  Wrench,
  Crown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { EditEmployeeSheet } from "./EditEmployeeSheet";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusConfig: Record<EmployeeStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktiv", variant: "default" },
  sick: { label: "Krank", variant: "secondary" },
  vacation: { label: "Urlaub", variant: "outline" },
  suspended: { label: "Gesperrt", variant: "destructive" },
  inactive: { label: "Einladung ausstehend", variant: "outline" },
};

const roleConfig: Record<EmployeeRole, { label: string; icon: typeof Eye }> = {
  view: { label: "Nur Ansicht", icon: Eye },
  employee: { label: "Mitarbeiter", icon: Wrench },
  team_lead: { label: "Teamleiter", icon: Crown },
};

export function EmployeeList() {
  const { employees, isLoading, deleteEmployee, sendInvitation } = useEmployees();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mitarbeiter suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Mitarbeiter einladen
        </Button>
      </div>

      {/* Employee count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{employees.length} Mitarbeiter</span>
      </div>

      {/* Employee list */}
      {filteredEmployees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Noch keine Mitarbeiter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Lade Mitarbeiter ein, um Termine zuzuweisen und Arbeit zu delegieren.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Mitarbeiter einladen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmployees.map((employee) => {
            const status = statusConfig[employee.status];
            const role = roleConfig[employee.role];
            const RoleIcon = role.icon;

            return (
              <Card key={employee.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={employee.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(employee.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{employee.full_name}</h3>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </span>
                        {employee.phone && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {role.label}
                        </Badge>
                        {employee.can_work_alone && (
                          <Badge variant="secondary" className="text-xs">
                            Alleinarbeit
                          </Badge>
                        )}
                        {employee.contract_start_date && (
                          <span className="text-xs text-muted-foreground hidden md:inline">
                            seit {format(new Date(employee.contract_start_date), "MMM yyyy", { locale: de })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingEmployee(employee)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        {employee.status === "inactive" && (
                          <DropdownMenuItem
                            onClick={() => sendInvitation.mutate(employee.id)}
                            disabled={sendInvitation.isPending}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Einladung senden
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {employee.status === "active" && (
                          <DropdownMenuItem
                            onClick={() =>
                              deleteEmployee.mutate(employee.id)
                            }
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deaktivieren
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteConfirm(employee)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal open={showAddModal} onOpenChange={setShowAddModal} />

      {/* Edit Employee Sheet */}
      {editingEmployee && (
        <EditEmployeeSheet
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitarbeiter löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du <strong>{deleteConfirm?.full_name}</strong> wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  deleteEmployee.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
