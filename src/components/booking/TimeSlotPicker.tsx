import { useState, useEffect, useMemo } from "react";
import { format, addDays, isSameDay, startOfDay, parse, isAfter, isBefore, addMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BusinessHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface TimeSlotPickerProps {
  providerId: string;
  serviceDuration: number;
  onSelectSlot: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

interface Appointment {
  date: string;
  time: string | null;
  duration: number | null;
}

const dayMap: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function TimeSlotPicker({
  providerId,
  serviceDuration,
  onSelectSlot,
  selectedDate,
  selectedTime,
}: TimeSlotPickerProps) {
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch provider's business hours
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_hours")
        .eq("id", providerId)
        .maybeSingle();

      if (profile?.business_hours) {
        setBusinessHours(profile.business_hours as BusinessHours);
      }

      // Fetch existing appointments for the next 60 days
      const startDate = format(new Date(), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(), 60), "yyyy-MM-dd");

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("date, time, duration")
        .eq("provider_id", providerId)
        .gte("date", startDate)
        .lte("date", endDate)
        .neq("status", "cancelled");

      setAppointments(appointmentsData || []);
      setLoading(false);
    };

    fetchData();
  }, [providerId]);

  // Generate time slots for a given date
  const generateTimeSlots = (date: Date): string[] => {
    if (!businessHours) return [];

    const dayOfWeek = dayMap[date.getDay()];
    const hours = businessHours[dayOfWeek];

    if (!hours?.enabled) return [];

    const slots: string[] = [];
    const [startHour, startMin] = hours.start.split(":").map(Number);
    const [endHour, endMin] = hours.end.split(":").map(Number);

    let currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMin, 0, 0);

    // Don't show slots in the past
    const now = new Date();
    if (isSameDay(date, now)) {
      const minTime = addMinutes(now, 60); // At least 1 hour from now
      if (isAfter(minTime, currentSlot)) {
        currentSlot = minTime;
        // Round up to next 30 min interval
        const minutes = currentSlot.getMinutes();
        if (minutes > 0 && minutes <= 30) {
          currentSlot.setMinutes(30, 0, 0);
        } else if (minutes > 30) {
          currentSlot.setHours(currentSlot.getHours() + 1, 0, 0, 0);
        }
      }
    }

    while (addMinutes(currentSlot, serviceDuration) <= endTime) {
      slots.push(format(currentSlot, "HH:mm"));
      currentSlot = addMinutes(currentSlot, 30); // 30-min intervals
    }

    return slots;
  };

  // Check if a slot conflicts with existing appointments
  const isSlotAvailable = (date: Date, time: string): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    const [slotHour, slotMin] = time.split(":").map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(slotHour, slotMin, 0, 0);
    const slotEnd = addMinutes(slotStart, serviceDuration);

    for (const apt of appointments) {
      if (apt.date !== dateStr || !apt.time) continue;

      const [aptHour, aptMin] = apt.time.split(":").map(Number);
      const aptStart = new Date(date);
      aptStart.setHours(aptHour, aptMin, 0, 0);
      const aptEnd = addMinutes(aptStart, apt.duration || 60);

      // Check for overlap
      if (isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart)) {
        return false;
      }
    }

    return true;
  };

  // Available slots for the selected date
  const availableSlots = useMemo(() => {
    if (!currentDate || !businessHours) return [];

    const allSlots = generateTimeSlots(currentDate);
    return allSlots.filter((time) => isSlotAvailable(currentDate, time));
  }, [currentDate, businessHours, appointments, serviceDuration]);

  // Determine which days are disabled
  const isDateDisabled = (date: Date): boolean => {
    // Past dates
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
    
    // More than 60 days ahead
    if (isAfter(date, addDays(new Date(), 60))) return true;

    // No business hours for this day
    if (!businessHours) return true;
    
    const dayOfWeek = dayMap[date.getDay()];
    const hours = businessHours[dayOfWeek];
    
    return !hours?.enabled;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(date) => date && setCurrentDate(date)}
          disabled={isDateDisabled}
          locale={de}
          className="rounded-md border"
        />
      </div>

      {/* Time Slots */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Verfügbare Zeiten am {format(currentDate, "EEEE, d. MMMM", { locale: de })}
        </h3>

        {availableSlots.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              Keine verfügbaren Termine an diesem Tag
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableSlots.map((time) => (
              <Button
                key={time}
                variant={selectedDate && isSameDay(selectedDate, currentDate) && selectedTime === time ? "default" : "outline"}
                className="h-11"
                onClick={() => onSelectSlot(currentDate, time)}
              >
                {time}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
