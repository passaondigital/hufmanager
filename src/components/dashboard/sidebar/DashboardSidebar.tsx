import { NotificationsPanel } from "./NotificationsPanel";
import { TasksPanel } from "./TasksPanel";
import { QuickActionsPanel } from "./QuickActionsPanel";

interface DashboardSidebarProps {
  variant?: "provider" | "partner" | "employee";
}

export function DashboardSidebar({ variant = "provider" }: DashboardSidebarProps) {
  return (
    <div className="space-y-3">
      <NotificationsPanel />
      {variant !== "employee" && <TasksPanel />}
      <QuickActionsPanel variant={variant} />
    </div>
  );
}
