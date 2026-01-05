import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  Video,
  Clock,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isPast,
  isFuture,
} from "date-fns";
import { de } from "date-fns/locale";

interface ContentItem {
  id: string;
  title: string;
  content_type: "blog" | "video";
  is_published: boolean;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
}

interface ContentCalendarProps {
  items: ContentItem[];
  onItemClick: (item: ContentItem) => void;
  onDateClick?: (date: Date) => void;
}

export default function ContentCalendar({
  items,
  onItemClick,
  onDateClick,
}: ContentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getItemsForDay = (day: Date) => {
    return items.filter((item) => {
      // Check scheduled_at first, then published_at, then created_at
      const itemDate = item.scheduled_at
        ? new Date(item.scheduled_at)
        : item.published_at
        ? new Date(item.published_at)
        : new Date(item.created_at);
      return isSameDay(itemDate, day);
    });
  };

  const getItemStatus = (item: ContentItem) => {
    if (item.is_published) return "published";
    if (item.scheduled_at) {
      const scheduledDate = new Date(item.scheduled_at);
      if (isPast(scheduledDate)) return "overdue";
      return "scheduled";
    }
    return "draft";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "scheduled":
        return "bg-blue-500";
      case "overdue":
        return "bg-orange-500";
      default:
        return "bg-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <Badge variant="default" className="bg-green-500 text-xs">
            <Check className="w-3 h-3 mr-1" />
            Live
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="default" className="bg-blue-500 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Geplant
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="default" className="bg-orange-500 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Überfällig
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <EyeOff className="w-3 h-3 mr-1" />
            Entwurf
          </Badge>
        );
    }
  };

  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  // Stats
  const stats = useMemo(() => {
    const published = items.filter((i) => i.is_published).length;
    const scheduled = items.filter(
      (i) => !i.is_published && i.scheduled_at
    ).length;
    const drafts = items.filter(
      (i) => !i.is_published && !i.scheduled_at
    ).length;
    const blogs = items.filter((i) => i.content_type === "blog").length;
    const videos = items.filter((i) => i.content_type === "video").length;

    return { published, scheduled, drafts, blogs, videos };
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">Veröffentlicht</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.published}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Geplant</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.scheduled}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-sm text-muted-foreground">Entwürfe</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.drafts}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Blog-Posts</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.blogs}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Videos</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.videos}</p>
        </Card>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          {format(currentMonth, "MMMM yyyy", { locale: de })}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Heute
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayItems = getItemsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1 border-b border-r cursor-pointer transition-colors hover:bg-muted/30 ${
                  !isCurrentMonth ? "bg-muted/20" : ""
                } ${isCurrentDay ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                onClick={() => onDateClick?.(day)}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth ? "text-muted-foreground/50" : ""
                  } ${isCurrentDay ? "text-primary font-bold" : ""}`}
                >
                  {format(day, "d")}
                </div>

                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((item) => {
                    const status = getItemStatus(item);
                    return (
                      <TooltipProvider key={item.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                                status === "published"
                                  ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                  : status === "scheduled"
                                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                  : status === "overdue"
                                  ? "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onItemClick(item);
                              }}
                            >
                              <span className="flex items-center gap-1">
                                {item.content_type === "video" ? (
                                  <Video className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                )}
                                <span className="truncate">{item.title}</span>
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{item.title}</p>
                              {getStatusBadge(status)}
                              {item.scheduled_at && (
                                <p className="text-xs text-muted-foreground">
                                  Geplant:{" "}
                                  {format(
                                    new Date(item.scheduled_at),
                                    "dd.MM.yyyy HH:mm",
                                    { locale: de }
                                  )}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayItems.length - 3} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
