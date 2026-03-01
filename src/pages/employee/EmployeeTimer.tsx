import { EmployeeTimeTracker } from "@/components/employee/EmployeeTimeTracker";
import { EmployeeRoleGate } from "@/components/employee/EmployeeRoleGate";
import { Clock, Info } from "lucide-react";

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

      {/* EU compliance notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <p>
          Deine Arbeitszeiten werden gemäß EU-Arbeitszeitrichtlinie (EuGH 2019 / BAG 2022) erfasst und 2 Jahre aufbewahrt.
          Bei Fragen wende dich an deinen Arbeitgeber.
        </p>
      </div>

      <EmployeeRoleGate allowed={["employee", "team_lead"]}>
        <EmployeeTimeTracker />
      </EmployeeRoleGate>
    </div>
  );
};

export default EmployeeTimer;
