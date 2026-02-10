import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { MoreHorizontal, UserMinus, Shield, Pencil } from "lucide-react";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { useUpdateEmployee, useDeactivateEmployee } from "@/hooks/useEmployees";
import type { Employee, EmployeeStatus, EmployeeRole } from "@/types/team";
import {
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/types/team";

interface EmployeeListProps {
  employees: Employee[];
}

export function EmployeeList({ employees }: EmployeeListProps) {
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">("all");
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();

  const filtered =
    statusFilter === "all"
      ? employees
      : employees.filter((e) => e.status === statusFilter);

  const handleRoleChange = (employee: Employee, role: EmployeeRole) => {
    updateEmployee.mutate({ id: employee.id, updates: { role } });
  };

  const handleStatusChange = (employee: Employee, status: EmployeeStatus) => {
    updateEmployee.mutate({ id: employee.id, updates: { status } });
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as EmployeeStatus | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]).map(
              (status) => (
                <SelectItem key={status} value={status}>
                  {EMPLOYEE_STATUS_LABELS[status]}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} Mitarbeiter
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
          Keine Mitarbeiter gefunden.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  E-Mail
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Rolle
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Berechtigungen
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-[50px]">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((employee) => (
                <tr key={employee.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {employee.full_name}
                    </span>
                    <span className="block md:hidden text-xs text-muted-foreground mt-0.5">
                      {employee.email}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {employee.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {EMPLOYEE_ROLE_LABELS[employee.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <EmployeeStatusBadge status={employee.status} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      {employee.can_work_alone && (
                        <span className="border rounded px-1.5 py-0.5">Allein</span>
                      )}
                      {employee.can_document && (
                        <span className="border rounded px-1.5 py-0.5">Doku</span>
                      )}
                      {employee.can_communicate_with_customers && (
                        <span className="border rounded px-1.5 py-0.5">Kundenkontakt</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(
                              employee,
                              employee.role === "teamlead" ? "employee" : "teamlead"
                            )
                          }
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          {employee.role === "teamlead"
                            ? "Teamleiter-Rolle entfernen"
                            : "Zum Teamleiter machen"}
                        </DropdownMenuItem>
                        {employee.status === "active" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(employee, "suspended")}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Sperren
                          </DropdownMenuItem>
                        )}
                        {employee.status === "suspended" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(employee, "active")}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Entsperren
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deactivateEmployee.mutate(employee.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Deaktivieren
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
