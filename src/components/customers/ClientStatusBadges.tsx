import { Badge } from "@/components/ui/badge";
import { 
  PAYMENT_RATING_OPTIONS, 
  LIFECYCLE_STATUS_OPTIONS,
} from "@/components/horse-detail/types";

interface PaymentRatingBadgeProps {
  rating: string | null | undefined;
  size?: "sm" | "md";
}

export function PaymentRatingBadge({ rating, size = "md" }: PaymentRatingBadgeProps) {
  if (!rating) return null;
  
  const option = PAYMENT_RATING_OPTIONS.find(o => o.value === rating);
  if (!option) return null;
  
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  
  return (
    <Badge 
      variant="outline" 
      className={`font-semibold ${option.textColor} border-current ${sizeClasses}`}
    >
      {rating}
    </Badge>
  );
}

interface LifecycleStatusBadgeProps {
  status: string | null | undefined;
  size?: "sm" | "md";
}

export function LifecycleStatusBadge({ status, size = "md" }: LifecycleStatusBadgeProps) {
  if (!status) return null;
  
  const option = LIFECYCLE_STATUS_OPTIONS.find(o => o.value === status);
  if (!option) return null;
  
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  
  const colorClasses = {
    new: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    active: "bg-green-500/10 text-green-600 border-green-500/30",
    archive: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  }[status];
  
  return (
    <Badge 
      variant="outline" 
      className={`font-medium ${colorClasses} ${sizeClasses}`}
    >
      {option.label}
    </Badge>
  );
}

interface ClientBadgesProps {
  paymentRating?: string | null;
  lifecycleStatus?: string | null;
  size?: "sm" | "md";
}

export function ClientBadges({ paymentRating, lifecycleStatus, size = "sm" }: ClientBadgesProps) {
  return (
    <>
      <LifecycleStatusBadge status={lifecycleStatus} size={size} />
      <PaymentRatingBadge rating={paymentRating} size={size} />
    </>
  );
}
