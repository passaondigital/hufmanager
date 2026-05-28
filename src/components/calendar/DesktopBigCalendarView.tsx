import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, getISODay } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";
import { AppointmentTooltip } from "@/components/calendar/AppointmentTooltip";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { de };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const messages = {
  allDay: "Ganztägig",
  previous: "Zurück",
  next: "Weiter",
  today: "Heute",
  month: "Monat",
  week: "Woche",
  day: "Tag",
  agenda: "Agenda",
  date: "Datum",
  time: "Zeit",
  event: "Termin",
  noEventsInRange: "Keine Termine in diesem Zeitraum.",
  showMore: (total: number) => `+${total} weitere`,
};

interface DesktopBigCalendarViewProps {
  events: any[];
  currentView: any;
  currentDate: Date;
  onView: (view: any) => void;
  onNavigate: (date: Date) => void;
  onSelectSlot: (slotInfo: any) => void;
  onSelectEvent: (event: any, e: React.SyntheticEvent) => void;
  onEventDrop: (args: any) => void;
  eventStyleGetter: (event: any) => { style: React.CSSProperties };
  onAssign: (appointmentId: string) => void;
  newClientDays?: number[];
}

export function DesktopBigCalendarView({
  events,
  currentView,
  currentDate,
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  onEventDrop,
  eventStyleGetter,
  onAssign,
  newClientDays = [1, 6],
}: DesktopBigCalendarViewProps) {
  const dayPropGetter = (date: Date) => {
    if (newClientDays.includes(getISODay(date))) {
      return {
        style: { backgroundColor: "rgb(255 251 235)", borderLeft: "3px solid rgb(217 119 6)" },
        title: "Neukundentag",
      };
    }
    return {};
  };

  return (
    <DnDCalendar
      localizer={localizer}
      events={events}
      view={currentView}
      onView={onView}
      date={currentDate}
      onNavigate={onNavigate}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      onEventDrop={onEventDrop}
      eventPropGetter={eventStyleGetter}
      dayPropGetter={dayPropGetter}
      selectable
      resizable={false}
      messages={messages}
      culture="de"
      step={30}
      timeslots={2}
      min={new Date(2000, 0, 1, 6, 0)}
      max={new Date(2000, 0, 1, 21, 0)}
      className="rounded-lg"
      components={{
        event: ({ event }: { event: any }) => (
          <AppointmentTooltip
            appointment={event.resource}
            onAssign={(id) => onAssign(id)}
          >
            <div className="px-1 py-0.5 text-xs truncate">
              {event.resource.is_confirmed_by_client && (
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
              )}
              {event.resource.price_group_applied && (
                <span className="bg-white/30 rounded px-1 mr-1 text-[10px] font-bold">
                  {event.resource.price_group_applied === "vip"
                    ? "VIP"
                    : event.resource.price_group_applied === "grossstall"
                    ? "GS"
                    : event.resource.price_group_applied === "individuell"
                    ? "IND"
                    : ""}
                </span>
              )}
              {event.title}
            </div>
          </AppointmentTooltip>
        ),
      }}
    />
  );
}
