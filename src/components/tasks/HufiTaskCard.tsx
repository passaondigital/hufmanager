import type { HufiTask, TaskStep } from "@/lib/hufi-task-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  task: HufiTask;
  onConfirm: (taskId: string, stepId: string) => void;
  onCancel: (taskId: string) => void;
  voiceLoopActive?: boolean;
}

const STEP_ICONS: Record<string, string> = {
  done: "✅",
  running: "⏳",
  pending: "○",
  failed: "❌",
};

export function HufiTaskCard({ task, onConfirm, onCancel }: Props) {
  const confirmStep = task.steps.find(
    (s) => s.requires_confirm && !s.confirmed_at && s.status === "pending"
  ) ?? task.steps.find(
    (s) => s.requires_confirm && !s.confirmed_at
  );

  const isAwaiting = task.status === "awaiting_confirm";
  const isDone = task.status === "done";
  const isFailed = task.status === "failed";
  const isCancelled = task.status === "cancelled";

  const statusColor = isDone
    ? "border-green-500/30 bg-green-950/20"
    : isFailed
    ? "border-red-500/30 bg-red-950/20"
    : isAwaiting
    ? "border-orange-500/40 bg-orange-950/20"
    : "border-white/10 bg-white/5";

  return (
    <div className={cn("rounded-xl border p-3 space-y-2 text-sm", statusColor)}>
      <div className="flex items-center gap-2 font-medium text-white/90">
        <span>⚙️</span>
        <span>{task.title}</span>
      </div>

      <div className="space-y-1">
        {task.steps.map((step, i) => {
          const icon = STEP_ICONS[step.status] ?? "○";
          const isCurrentRunning = step.status === "running";
          return (
            <div
              key={step.id ?? i}
              className={cn(
                "flex items-center gap-2 text-xs",
                step.status === "done" ? "text-green-400" :
                step.status === "failed" ? "text-red-400" :
                isCurrentRunning ? "text-orange-300 animate-pulse" :
                "text-white/40"
              )}
            >
              <span className="w-4 text-center">{icon}</span>
              <span>{step.description}</span>
              {step.status === "done" && step.result !== undefined && (() => {
                const r = step.result as Record<string, unknown>;
                if (r?.count !== undefined) return <span className="ml-auto text-white/50">({r.count as number})</span>;
                if (r?.created_count !== undefined) return <span className="ml-auto text-white/50">({r.created_count as number})</span>;
                return null;
              })()}
            </div>
          );
        })}
      </div>

      {task.result_summary && (isDone || isFailed) && (
        <p className="text-xs text-white/60 border-t border-white/10 pt-2">
          {task.result_summary}
        </p>
      )}

      {isAwaiting && confirmStep && !isCancelled && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-7 flex-1"
            onClick={() => onConfirm(task.id, confirmStep.id)}
          >
            Bestätigen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/40 hover:text-white/70 text-xs h-7"
            onClick={() => onCancel(task.id)}
          >
            Abbrechen
          </Button>
        </div>
      )}

      {isCancelled && (
        <p className="text-xs text-white/30">Abgebrochen</p>
      )}
    </div>
  );
}
