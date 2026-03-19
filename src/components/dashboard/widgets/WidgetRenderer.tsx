import { Suspense, lazy, type ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { WidgetContentProps } from "./content/types";

const WeekCalendarWidgetContent = lazy(() => import("./content/WeekCalendarContent"));
const DayCalendarContent = lazy(() => import("./content/DayCalendarContent"));
const NextAppointmentsContent = lazy(() => import("./content/NextAppointmentsContent"));
const CustomersContent = lazy(() => import("./content/CustomersContent"));
const HorsesContent = lazy(() => import("./content/HorsesContent"));
const RevenueWeekContent = lazy(() => import("./content/RevenueWeekContent"));
const RevenueMonthContent = lazy(() => import("./content/RevenueMonthContent"));
const OpenInvoicesContent = lazy(() => import("./content/OpenInvoicesContent"));
const InboxContent = lazy(() => import("./content/InboxContent"));
const HoofStatusContent = lazy(() => import("./content/HoofStatusContent"));
const ReviewsContent = lazy(() => import("./content/ReviewsContent"));
const OrderStatusContent = lazy(() => import("./content/OrderStatusContent"));
const WeatherContent = lazy(() => import("./content/WeatherContent"));
const NotesContent = lazy(() => import("./content/NotesContent"));
const QuoteContent = lazy(() => import("./content/QuoteContent"));
const BirthdaysContent = lazy(() => import("./content/BirthdaysContent"));
const WorkTimeContent = lazy(() => import("./content/WorkTimeContent"));
const PlaceholderContent = lazy(() => import("./content/PlaceholderContent"));
const ClientNextAppointmentContent = lazy(() => import("./content/ClientNextAppointmentContent"));
const ClientHorsesContent = lazy(() => import("./content/ClientHorsesContent"));
const ClientHealthFeedContent = lazy(() => import("./content/ClientHealthFeedContent"));
const ClientActionCenterContent = lazy(() => import("./content/ClientActionCenterContent"));
const ClientProviderContent = lazy(() => import("./content/ClientProviderContent"));
const ClientOrdersContent = lazy(() => import("./content/ClientOrdersContent"));

interface WidgetRendererProps {
  type: string;
  settings: Record<string, unknown>;
  widgetId: string;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
}

const WIDGET_MAP: Record<string, React.LazyExoticComponent<ComponentType<WidgetContentProps>>> = {
  kalender_woche: WeekCalendarWidgetContent,
  kalender_tag: DayCalendarContent,
  naechste_termine: NextAppointmentsContent,
  kunden_uebersicht: CustomersContent,
  pferde_uebersicht: HorsesContent,
  umsatz_woche: RevenueWeekContent,
  umsatz_monat: RevenueMonthContent,
  offene_rechnungen: OpenInvoicesContent,
  anfragen_inbox: InboxContent,
  huf_status: HoofStatusContent,
  bewertungen: ReviewsContent,
  auftragsstatus: OrderStatusContent,
  wetter: WeatherContent,
  notizen: NotesContent,
  zitat_des_tages: QuoteContent,
  geburtstage: BirthdaysContent,
  arbeitszeit: WorkTimeContent,
  impfungen_faellig: PlaceholderContent,
  statistik_kunden: PlaceholderContent,
  statistik_pferde: PlaceholderContent,
};

export function WidgetRenderer({ type, settings, widgetId, onUpdateSettings }: WidgetRendererProps) {
  const Component = WIDGET_MAP[type] || PlaceholderContent;

  return (
    <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
      <Component
        settings={settings}
        widgetId={widgetId}
        onUpdateSettings={onUpdateSettings}
        widgetType={type}
      />
    </Suspense>
  );
}
