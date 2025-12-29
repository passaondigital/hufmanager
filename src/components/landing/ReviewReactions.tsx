import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReviewReactionsProps {
  reviewId: string;
  reactions: { green: number; yellow: number; red: number };
}

const STORAGE_KEY = "review_reactions";

// Custom Horseshoe SVG component
const HorseshoeIcon = ({ className, fill }: { className?: string; fill?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={fill || "currentColor"}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V22h2v-6h4v6h2v-7.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm-2 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
);

// Heart-styled horseshoe for the "love" reaction
const HeartHorseshoeIcon = ({ className, fill }: { className?: string; fill?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={fill || "currentColor"}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export const ReviewReactions = ({ reviewId, reactions }: ReviewReactionsProps) => {
  const [localReactions, setLocalReactions] = useState(reactions);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check localStorage for existing reaction on this review
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed[reviewId]) {
          setUserReaction(parsed[reviewId]);
        }
      } catch {
        // Invalid storage, ignore
      }
    }
  }, [reviewId]);

  const handleReaction = async (type: "green" | "yellow" | "red") => {
    // Check if user already reacted to this review
    if (userReaction) {
      toast({
        title: "Bereits reagiert",
        description: "Du hast bereits auf diese Bewertung reagiert.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("increment_review_reaction", {
        review_id: reviewId,
        reaction_type: type,
      });

      if (error) throw error;

      // Update local state
      setLocalReactions((prev) => ({
        ...prev,
        [type]: prev[type] + 1,
      }));

      // Store in localStorage to prevent future reactions
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[reviewId] = type;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      setUserReaction(type);

      toast({
        title: "Danke!",
        description: "Deine Reaktion wurde gespeichert.",
      });
    } catch (error) {
      console.error("Failed to submit reaction:", error);
      toast({
        title: "Fehler",
        description: "Reaktion konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reactionButtons = [
    {
      type: "green" as const,
      label: "Stimme zu",
      color: "text-green-500",
      hoverColor: "hover:text-green-400",
      bgColor: "bg-green-500/10",
      hoverBg: "hover:bg-green-500/20",
      activeColor: "text-green-500 bg-green-500/20",
      icon: HorseshoeIcon,
    },
    {
      type: "yellow" as const,
      label: "Hilfreich",
      color: "text-amber-500",
      hoverColor: "hover:text-amber-400",
      bgColor: "bg-amber-500/10",
      hoverBg: "hover:bg-amber-500/20",
      activeColor: "text-amber-500 bg-amber-500/20",
      icon: HorseshoeIcon,
    },
    {
      type: "red" as const,
      label: "Begeistert",
      color: "text-rose-500",
      hoverColor: "hover:text-rose-400",
      bgColor: "bg-rose-500/10",
      hoverBg: "hover:bg-rose-500/20",
      activeColor: "text-rose-500 bg-rose-500/20",
      icon: HeartHorseshoeIcon,
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
        {reactionButtons.map((btn) => {
          const isActive = userReaction === btn.type;
          const Icon = btn.icon;
          
          return (
            <Tooltip key={btn.type}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleReaction(btn.type)}
                  disabled={isSubmitting || !!userReaction}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
                    "text-sm font-medium",
                    isActive
                      ? btn.activeColor
                      : cn(
                          btn.bgColor,
                          btn.hoverBg,
                          "text-muted-foreground",
                          btn.hoverColor
                        ),
                    userReaction && !isActive && "opacity-50 cursor-not-allowed",
                    !userReaction && "cursor-pointer"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !userReaction && "group-hover:scale-110"
                    )}
                    fill={isActive ? undefined : "currentColor"}
                  />
                  <span>{localReactions[btn.type]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{btn.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
