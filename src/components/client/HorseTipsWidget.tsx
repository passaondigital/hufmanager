import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { getTipsForCurrentWeek } from "@/data/horseTips";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { motion, AnimatePresence } from "framer-motion";

export function HorseTipsWidget() {
  const tips = getTipsForCurrentWeek();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useLocalStorage("hm_tips_dismissed_week", "");

  // Check if dismissed this week
  const now = new Date();
  const weekKey = `${now.getFullYear()}-W${Math.ceil((Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)}`;

  if (dismissed === weekKey) return null;

  const tip = tips[currentIndex];

  return (
    <Card className="border border-border bg-card shadow-none rounded-xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Pferde-Tipp</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={() => setDismissed(weekKey)}
            aria-label="Tipp schließen"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <Badge variant="secondary" className="text-[10px] font-medium bg-muted text-muted-foreground border-0">
              {tip.emoji} {tip.categoryLabel}
            </Badge>
            <p className="text-sm text-foreground/90 leading-relaxed">{tip.text}</p>
          </motion.div>
        </AnimatePresence>

        {tips.length > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => setCurrentIndex((i) => (i - 1 + tips.length) % tips.length)}
              aria-label="Vorheriger Tipp"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1.5 items-center">
              {tips.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === currentIndex ? "bg-primary" : "bg-muted-foreground/20"}`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => setCurrentIndex((i) => (i + 1) % tips.length)}
              aria-label="Nächster Tipp"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
