import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LastVisitWidgetProps {
  userId: string;
}

interface Appointment {
  id: string;
  date: string;
  service_type: string | null;
  completion_pdf_url: string | null;
  horse: {
    name: string;
  } | null;
}

export function LastVisitWidget({ userId }: LastVisitWidgetProps) {
  const [lastVisit, setLastVisit] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastVisit = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          service_type,
          completion_pdf_url,
          horse:horses(name)
        `)
        .lt("date", today)
        .eq("status", "completed")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLastVisit(data as Appointment | null);
      setLoading(false);
    };

    fetchLastVisit();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!lastVisit) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Letzter Besuch</p>
              <p className="font-medium text-foreground">
                {format(new Date(lastVisit.date), "dd. MMM yyyy", { locale: de })}
              </p>
              {lastVisit.horse && (
                <p className="text-xs text-muted-foreground">
                  🐴 {lastVisit.horse.name}
                </p>
              )}
            </div>
          </div>
          {lastVisit.completion_pdf_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(lastVisit.completion_pdf_url!, "_blank")}
            >
              <FileText className="h-4 w-4 mr-1" />
              Bericht
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
