import { useState } from "react";
import { useEmployees, EmployeeRole, EmploymentType } from "@/hooks/useEmployees";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Shield, Settings, Eye, Wrench, Crown } from "lucide-react";

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions: { value: EmployeeRole; label: string; description: string; icon: typeof Eye }[] = [
  {
    value: "view",
    label: "Nur Ansicht",
    description: "Kann zugewiesene Termine sehen, aber nicht bearbeiten",
    icon: Eye,
  },
  {
    value: "employee",
    label: "Mitarbeiter",
    description: "Kann Arbeit dokumentieren und Materialverbrauch erfassen",
    icon: Wrench,
  },
  {
    value: "team_lead",
    label: "Teamleiter",
    description: "Kann Termine zuweisen und Dokumentation prüfen",
    icon: Crown,
  },
];

export function AddEmployeeModal({ open, onOpenChange }: AddEmployeeModalProps) {
  const { createEmployee, sendInvitation } = useEmployees();
  const [activeTab, setActiveTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "employee" as EmployeeRole,
    employment_type: "employee" as EmploymentType,
    contract_start_date: "",
    can_work_alone: false,
    can_apply_hoof_protection: false,
    can_work_sensitive_clients: false,
    notes: "",
  });

  const handleSubmit = async () => {
    const employee = await createEmployee.mutateAsync({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role,
      employment_type: formData.employment_type,
      contract_start_date: formData.contract_start_date || undefined,
      can_work_alone: formData.can_work_alone,
      can_apply_hoof_protection: formData.can_apply_hoof_protection,
      can_work_sensitive_clients: formData.can_work_sensitive_clients,
      notes: formData.notes || undefined,
    });

    // Automatically send invitation
    if (employee) {
      sendInvitation.mutate(employee.id);
    }

    // Reset form
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      role: "employee",
      employment_type: "employee",
      contract_start_date: "",
      can_work_alone: false,
      can_apply_hoof_protection: false,
      can_work_sensitive_clients: false,
      notes: "",
    });
    setActiveTab("basic");
    onOpenChange(false);
  };

  const isValid = formData.full_name.trim() && formData.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mitarbeiter einladen</DialogTitle>
          <DialogDescription>
            Lade einen neuen Mitarbeiter ein. Er erhält eine E-Mail mit einem Einladungslink.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              Basis
            </TabsTrigger>
            <TabsTrigger value="role" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Rolle
            </TabsTrigger>
            <TabsTrigger value="permissions" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Rechte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Name *</Label>
              <Input
                id="full_name"
                placeholder="Max Mustermann"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="max@example.de"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                placeholder="+49 170 1234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </TabsContent>

          <TabsContent value="role" className="space-y-4 mt-4">
            <div className="space-y-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.role === option.value;
                return (
                  <div
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setFormData({ ...formData, role: option.value })}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                placeholder="Interne Notizen zum Mitarbeiter..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createEmployee.isPending}
          >
            {createEmployee.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Einladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
