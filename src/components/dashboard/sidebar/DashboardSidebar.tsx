import { NotificationsPanel } from "./NotificationsPanel";
import { TasksPanel } from "./TasksPanel";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { Mission1MillionWidget } from "@/components/dashboard/Mission1MillionWidget";

interface DashboardSidebarProps {
  variant?: "provider" | "partner" | "employee";
}

export function DashboardSidebar({ variant = "provider" }: DashboardSidebarProps) {
  return (
    <div className="space-y-3">
      <Mission1MillionWidget />
      <NotificationsPanel />
      {variant !== "employee" && <TasksPanel />}
      <QuickActionsPanel variant={variant} />
    </div>
  );
}
