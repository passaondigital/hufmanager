import { WorkTimer } from "@/components/workmode/WorkTimer";
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
      <WorkTimer />
    </div>
  );
};

export default EmployeeTimer;
