import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FriendlyEmptyStateProps {
  icon: LucideIcon | string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl?: string;
  onAction?: () => void;
}

export function FriendlyEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionUrl,
  onAction,
}: FriendlyEmptyStateProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onAction) {
      onAction();
    } else if (actionUrl) {
      navigate(actionUrl);
    }
  };

  return (
    <Card className="border-dashed border-2 border-border/50 bg-muted/20">
      <CardContent className="py-12 text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          {typeof Icon === "string" ? (
            <span className="text-4xl">{Icon}</span>
          ) : (
            <Icon className="h-10 w-10 text-primary" />
          )}
        </div>

        {/* Text */}
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
          {description}
        </p>

        {/* Big Orange Button */}
        <Button 
          size="lg" 
          className="px-8 h-12 text-base font-semibold"
          onClick={handleClick}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
