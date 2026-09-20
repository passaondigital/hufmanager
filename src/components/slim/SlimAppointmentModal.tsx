import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, subMonths } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const AppointmentFormModal = lazy(() =>
  import("@/components/calendar/AppointmentFormModal").then((m) => ({ default: m.AppointmentFormModal }))
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  preselectedHorseId?: string | null;
}

/**
 * Slim-Shell-Einstieg für den canonical Termin-Dialog. Lädt dieselbe
 * AppointmentFormModal wie der Legacy-Kalender (keine zweite
 * Terminimplementierung), damit "Termin hinzufügen" aus Heute/Tour die
 * mobile Shell nicht mehr verlassen muss.
 */
export function SlimAppointmentModal({ isOpen, onClose, selectedDate, preselectedHorseId = null }: Props) {
  const { user } = useAuth();
  const dateRange = useMemo(() => ({
    start: format(subMonths(selectedDate, 3), "yyyy-MM-dd"),
    end: format(addMonths(selectedDate, 3), "yyyy-MM-dd"),
  }), [selectedDate]);

  const { data: existingAppointments = [], isLoading, isError } = useQuery({
    queryKey: ["appointments", user?.id, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!user?.id) return [];
      const { fetchAppointmentsByDateRange } = await import("@/services/appointmentService");
      return fetchAppointmentsByDateRange(user.id, dateRange.start, dateRange.end);
    },
    enabled: !!user?.id && isOpen,
  });

  if (!isOpen) return null;

  return (
    <Suspense fallback={null}>
      <AppointmentFormModal
        isOpen={isOpen}
        onClose={onClose}
        selectedDate={selectedDate}
        existingAppointments={existingAppointments}
        preselectedHorseId={preselectedHorseId}
        appointmentsLoading={isLoading}
        appointmentsLoadError={isError}
      />
    </Suspense>
  );
}
