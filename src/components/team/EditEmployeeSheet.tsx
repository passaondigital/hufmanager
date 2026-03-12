import { useState } from "react";
import { useEmployees, Employee, EmployeeRole, EmployeeStatus, EmploymentType } from "@/hooks/useEmployees";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Shield, Settings, Calendar, Clock, FileText, PawPrint } from "lucide-react";
import { EmployeeHorseAccess } from "./EmployeeHorseAccess";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface EditEmployeeSheetProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "Aktiv" },
  { value: "sick", label: "Krank" },
  { value: "vacation", label: "Urlaub" },
  { value: "suspended", label: "Gesperrt" },
  { value: "inactive", label: "Inaktiv" },
];

export function EditEmployeeSheet({ employee, open, onOpenChange }: EditEmployeeSheetProps) {
  const { updateEmployee } = useEmployees();
  
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    email: employee.email,
    phone: employee.phone || "",
    role: employee.role,
    status: employee.status,
    employment_type: employee.employment_type,
    contract_start_date: employee.contract_start_date || "",
    contract_end_date: employee.contract_end_date || "",
    can_work_alone: employee.can_work_alone,
    can_apply_hoof_protection: employee.can_apply_hoof_protection,
    can_work_sensitive_clients: employee.can_work_sensitive_clients,
    custom_permissions: employee.custom_permissions || {},
    notes: employee.notes || "",
  });

  const handleSave = async () => {
    await updateEmployee.mutateAsync({
      id: employee.id,
      data: {
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        role: formData.role,
        status: formData.status,
        employment_type: formData.employment_type,
        contract_start_date: formData.contract_start_date || undefined,
        contract_end_date: formData.contract_end_date || undefined,
        can_work_alone: formData.can_work_alone,
        can_apply_hoof_protection: formData.can_apply_hoof_protection,
        can_work_sensitive_clients: formData.can_work_sensitive_clients,
        custom_permissions: formData.custom_permissions,
        notes: formData.notes || undefined,
      },
    });
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{employee.full_name}</SheetTitle>
              <SheetDescription>{employee.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Rechte
            </TabsTrigger>
            <TabsTrigger value="contract" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Vertrag
            </TabsTrigger>
            <TabsTrigger value="horses" className="text-xs">
              <PawPrint className="h-3 w-3 mr-1" />
              Pferde
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" value={formData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                E-Mail kann nach Erstellung nicht geändert werden
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: EmployeeStatus) =>
                    setFormData({ ...formData, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v: EmployeeRole) =>
                    setFormData({ ...formData, role: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Nur Ansicht</SelectItem>
                    <SelectItem value="employee">Mitarbeiter</SelectItem>
                    <SelectItem value="team_lead">Teamleiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alleinarbeit erlaubt</Label>
                  <p className="text-xs text-muted-foreground">
                    Kann eigenständig ohne Begleitung arbeiten
                  </p>
                </div>
                <Switch
                  checked={formData.can_work_alone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, can_work_alone: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hufschutz anbringen</Label>
                  <p className="text-xs text-muted-foreground">
                    Darf Beschläge und Hufschutz anwenden
                  </p>
                </div>
                <Switch
                  checked={formData.can_apply_hoof_protection}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, can_apply_hoof_protection: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sensible Kunden</Label>
                  <p className="text-xs text-muted-foreground">
                    Kann mit besonders sensiblen Kunden arbeiten
                  </p>
                </div>
                <Switch
                  checked={formData.can_work_sensitive_clients}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, can_work_sensitive_clients: checked })
                  }
                />
              </div>
            </div>

            {/* Custom Permissions (App features) */}
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-sm">App-Module freischalten</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Steuere welche Module der Mitarbeiter in seiner App sieht.
              </p>
              
              {[
                { key: "can_use_maps", label: "Maps / Navigation", desc: "Kartenansicht und Navigation zu Terminen" },
                { key: "can_use_tour_manager", label: "Tour-Manager", desc: "Erweiterte Tourenplanung und -optimierung" },
                { key: "can_chat_clients", label: "Kundenchat", desc: "Im Namen des Betriebs mit Kunden chatten" },
              ].map((perm) => (
                <div key={perm.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{perm.label}</Label>
                    <p className="text-xs text-muted-foreground">{perm.desc}</p>
                  </div>
                  <Switch
                    checked={formData.custom_permissions[perm.key] || false}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        custom_permissions: { ...formData.custom_permissions, [perm.key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Role-based permissions info */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm mb-2">Rollenberechtigungen</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {formData.role === "view" && (
                  <>
                    <li>• Kann zugewiesene Termine sehen</li>
                    <li>• Kann Kunden- und Pferdedaten lesen</li>
                    <li>• Keine Bearbeitungsrechte</li>
                  </>
                )}
                {formData.role === "employee" && (
                  <>
                    <li>• Kann zugewiesene Termine sehen</li>
                    <li>• Kann ein-/auschecken</li>
                    <li>• Kann Arbeit dokumentieren</li>
                    <li>• Kann Materialverbrauch erfassen</li>
                  </>
                )}
                {formData.role === "team_lead" && (
                  <>
                    <li>• Kann alle Team-Termine sehen</li>
                    <li>• Kann Termine zuweisen</li>
                    <li>• Kann Dokumentation prüfen</li>
                    <li>• Kann Preise sehen (nur lesen)</li>
                  </>
                )}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="contract" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Beschäftigungsart</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(v: EmploymentType) =>
                  setFormData({ ...formData, employment_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Angestellt</SelectItem>
                  <SelectItem value="contractor">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Startdatum</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_start_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Enddatum</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_end_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Invitation status */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm mb-2">Einladungsstatus</h4>
              <div className="space-y-2 text-sm">
                {employee.invitation_sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Einladung gesendet:</span>
                    <span>
                      {format(new Date(employee.invitation_sent_at), "dd.MM.yyyy HH:mm", {
                        locale: de,
                      })}
                    </span>
                  </div>
                )}
                {employee.invitation_accepted_at ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Angenommen:</span>
                    <Badge variant="default" className="bg-green-600">
                      {format(new Date(employee.invitation_accepted_at), "dd.MM.yyyy", {
                        locale: de,
                      })}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">Ausstehend</Badge>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="horses" className="mt-4">
            <EmployeeHorseAccess
              employeeId={employee.id}
              employeeName={employee.full_name}
            />
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
