import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

/**
 * Reusable skeleton loading patterns matching actual content heights.
 * Prevents layout shift by mirroring real component dimensions.
 */

/** Skeleton for a StatCard in the dashboard (matches 100px min-h) */
export function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-4 min-h-[100px]">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

/** Skeleton grid for dashboard stats (2-col mobile, 4-col desktop) */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a standard card with header + content rows */
export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      <div className="p-4 border-b border-border">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a list item row (matches 64px min-h) */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 min-h-[64px]">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

/** Skeleton for a list of items inside a card */
export function ListSkeleton({ count = 4, title }: { count?: number; title?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {title && (
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-36" />
        </div>
      )}
      <div className="divide-y divide-border">
        {Array.from({ length: count }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a full-width form (input fields) */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-[52px] w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

/** Skeleton for image loading (matches aspect ratio) */
export function ImageSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("w-full aspect-square rounded-lg", className)} />
  );
}
