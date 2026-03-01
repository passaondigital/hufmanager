import { EmployeeTimeTracker } from "@/components/employee/EmployeeTimeTracker";
import { EmployeeRoleGate } from "@/components/employee/EmployeeRoleGate";
import { Clock } from "lucide-react";

const EmployeeTimer = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Zeiterfassung
        </h1>
        <p className="text-sm text-muted-foreground">Arbeitszeiten dokumentieren</p>
      </div>
      <EmployeeRoleGate allowed={["employee", "team_lead"]}>
        <EmployeeTimeTracker />
      </EmployeeRoleGate>
    </div>
  );
};

export default EmployeeTimer;
