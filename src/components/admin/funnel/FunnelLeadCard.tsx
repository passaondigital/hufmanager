import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail, Phone, MapPin, Building2, Calendar, Video,
  UserPlus, CheckCircle2, Target, TrendingUp, Trash2, Clock, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LeadStatus = "neu" | "kontaktiert" | "demo_gebucht" | "demo_durchgeführt" | "angebot" | "gewonnen" | "verloren";

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; icon: React.ElementType }> = {
  neu: { label: "Neu", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: UserPlus },
  kontaktiert: { label: "Kontaktiert", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Phone },
  demo_gebucht: { label: "Demo gebucht", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Calendar },
  demo_durchgeführt: { label: "Demo ✓", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: CheckCircle2 },
  angebot: { label: "Angebot", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Target },
  gewonnen: { label: "Gewonnen", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: TrendingUp },
  verloren: { label: "Verloren", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Trash2 },
};

const TOPIC_LABELS: Record<string, string> = {
  frage: "Frage",
  demo_1zu1: "1:1 Demo",
  beratung: "Beratung",
  sonstiges: "Sonstiges",
};

export interface FunnelLeadData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  demo_booked_at: string | null;
  demo_completed_at: string | null;
  converted_at: string | null;
  postal_code: string | null;
  tags: string[] | null;
  topic: string | null;
  contact_preference: string | null;
  preferred_slots: any;
  message: string | null;
  contact_history: any;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FunnelLeadCardProps {
  lead: FunnelLeadData;
  onClick: () => void;
}

export function FunnelLeadCard({ lead, onClick }: FunnelLeadCardProps) {
  const statusCfg = STATUS_CONFIG[lead.status as LeadStatus] || STATUS_CONFIG.neu;
  const StatusIcon = statusCfg.icon;
  const slots = Array.isArray(lead.preferred_slots) ? lead.preferred_slots : [];

  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onClick}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{lead.full_name}</p>
              <Badge variant="outline" className={cn("text-xs shrink-0", statusCfg.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusCfg.label}
              </Badge>
              {lead.topic && (
                <Badge variant="secondary" className="text-xs">
                  {TOPIC_LABELS[lead.topic] || lead.topic}
                </Badge>
              )}
              {lead.contact_preference === "video" && (
                <Badge variant="outline" className="text-xs text-indigo-500 border-indigo-500/20">
                  <Video className="h-3 w-3 mr-1" /> Video
                </Badge>
              )}
              {lead.contact_preference === "phone" && (
                <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/20">
                  <Phone className="h-3 w-3 mr-1" /> Telefon
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
              {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
              {lead.postal_code && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.postal_code}</span>}
              {lead.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company_name}</span>}
            </div>
            {slots.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {slots.slice(0, 2).map((s: any, i: number) => (
                  <span key={i} className="bg-muted px-1.5 py-0.5 rounded">{s.date} {s.time}</span>
                ))}
                {slots.length > 2 && <span>+{slots.length - 2}</span>}
              </div>
            )}
            {lead.message && (
              <div className="flex items-start gap-1 mt-1.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="line-clamp-1">{lead.message}</span>
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(lead.created_at), "dd.MM.yy", { locale: de })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
