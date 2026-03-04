import { cn } from "@/lib/utils";

interface DemoBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Orangener "Demo"-Badge für Datenkarten, Listeneinträge etc.
 * Wird nur angezeigt wenn der aktuelle User ein Demo-Account ist.
 */
export function DemoBadge({ className, size = "sm" }: DemoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/30",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      Demo
    </span>
  );
}
