import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Check, Sparkles } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface AppointmentChecklistWidgetProps {
  userId: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string | null;
}

const CHECKLIST_ITEMS = [
  { id: "dry_clean", label: "Pferd ist trocken & sauber", emoji: "🐴" },
  { id: "lighting", label: "Arbeitsplatz ist beleuchtet", emoji: "💡" },
  { id: "ground", label: "Ebener, fester Boden vorhanden", emoji: "🧱" },
  { id: "power", label: "Stromanschluss in der Nähe", emoji: "🔌" },
];

export function AppointmentChecklistWidget({ userId }: AppointmentChecklistWidgetProps) {
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  // Load checklist state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`checklist_${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCheckedItems(parsed.items || {});
      } catch {
        setCheckedItems({});
      }
    }
  }, [userId]);

  // Fetch next appointment
  useEffect(() => {
    const fetchNextAppointment = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("appointments")
        .select("id, date, time")
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(1)
        .maybeSingle();

      setNextAppointment(data as Appointment | null);
      setLoading(false);
    };

    fetchNextAppointment();
  }, [userId]);

  // Save to localStorage when checkedItems change
  useEffect(() => {
    if (Object.keys(checkedItems).length > 0) {
      localStorage.setItem(
        `checklist_${userId}`,
        JSON.stringify({ items: checkedItems, appointmentId: nextAppointment?.id })
      );
    }
  }, [checkedItems, userId, nextAppointment?.id]);

  // Check if all items are checked
  const allChecked = CHECKLIST_ITEMS.every((item) => checkedItems[item.id]);

  // Trigger confetti when all items get checked
  useEffect(() => {
    if (allChecked && Object.keys(checkedItems).length === CHECKLIST_ITEMS.length) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [allChecked, checkedItems]);

  const handleCheck = (itemId: string, checked: boolean) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: checked,
    }));
  };

  if (loading) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-40 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextAppointment) {
    return null; // Don't show checklist if no appointment
  }

  const appointmentDate = new Date(nextAppointment.date);
  const countdown = formatDistanceToNow(appointmentDate, { locale: de, addSuffix: true });

  return (
    <Card className="border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
          >
            {/* Sparkles effect */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: Math.cos((i * 30 * Math.PI) / 180) * 60,
                  y: Math.sin((i * 30 * Math.PI) / 180) * 60,
                }}
                transition={{ 
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
                className="absolute text-xl"
              >
                {["✨", "🎉", "⭐", "💫"][i % 4]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-amber-600" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Dein nächster Termin
          </p>
        </div>

        {/* Date Display */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-bold text-foreground">
              {format(appointmentDate, "EEEE, dd. MMMM", { locale: de })}
            </p>
            <p className="text-sm text-amber-600">{countdown}</p>
          </div>
          
          {/* Completion Badge */}
          <AnimatePresence mode="wait">
            {allChecked ? (
              <motion.div
                key="complete"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
              >
                <Check className="h-5 w-5 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="incomplete"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {Object.values(checkedItems).filter(Boolean).length}/{CHECKLIST_ITEMS.length}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Checklist */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Ist alles vorbereitet?
          </p>
          
          {CHECKLIST_ITEMS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <label
                htmlFor={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  checkedItems[item.id]
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-background/50 border border-transparent hover:bg-background"
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={checkedItems[item.id] || false}
                  onCheckedChange={(checked) => handleCheck(item.id, checked === true)}
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-lg">{item.emoji}</span>
                <span
                  className={`text-sm flex-1 ${
                    checkedItems[item.id] ? "text-green-700 dark:text-green-400 line-through" : "text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </label>
            </motion.div>
          ))}
        </div>

        {/* Thank You Message */}
        <AnimatePresence>
          {allChecked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-center"
            >
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                🎉 Danke! Alles bereit für deinen Hufbearbeiter!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
