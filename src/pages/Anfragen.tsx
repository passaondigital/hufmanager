import { useState } from "react";
import { ListPageHeader } from "@/components/shared/ListPageHeader";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, MessageCircle, Phone, MapPin, Search, Filter, Calendar, AlertTriangle, HelpCircle, Loader2, Send, ClipboardList } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceOrderInbox } from "@/components/provider/ServiceOrderInbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { BroadcastModal } from "@/components/broadcast/BroadcastModal";
import { useCommunicationMode } from "@/hooks/useCommunicationMode";
import { openWhatsApp, waTextLeadReply } from "@/lib/whatsappTemplates";

interface Lead {
  id: string;
  provider_id: string;
  lead_type: string;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  name: string | null;
  message: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  neu: { label: "Neu", className: "bg-primary/10 text-primary" },
  kontaktiert: { label: "Kontaktiert", className: "bg-blue-500/10 text-blue-600" },
  angebot_gesendet: { label: "Angebot gesendet", className: "bg-amber-500/10 text-amber-600" },
  gewonnen: { label: "Gewonnen", className: "bg-accent/10 text-accent" },
  verloren: { label: "Verloren", className: "bg-muted text-muted-foreground" },
};

const typeConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  termin: { label: "Termin", icon: <Calendar className="h-4 w-4" />, className: "bg-blue-500/10 text-blue-600" },
  notfall: { label: "Notfall", icon: <AlertTriangle className="h-4 w-4" />, className: "bg-red-500/10 text-red-600" },
  frage: { label: "Frage", icon: <HelpCircle className="h-4 w-4" />, className: "bg-purple-500/10 text-purple-600" },
};

const Anfragen = () => {
  const { user } = useAuth();
  const { isWhatsApp } = useCommunicationMode();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("alle");
  const [search, setSearch] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "Status aktualisiert" });
    },
  });

  const filteredLeads = leads.filter(lead => {
    if (filter !== 'alle' && lead.status !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        lead.postal_code?.toLowerCase().includes(searchLower) ||
        lead.phone?.toLowerCase().includes(searchLower) ||
        lead.name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'vor wenigen Minuten';
    if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    return format(date, 'dd.MM.yyyy', { locale: de });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ListPageHeader
        title="Anfragen"
        count={leads.length}
        countLabel="Anfragen"
        action={
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowBroadcast(true)}
            >
              <Send className="h-4 w-4" />
              Rundmail
            </Button>
          </div>
        }
      />

      {/* Broadcast Modal */}
      <BroadcastModal open={showBroadcast} onOpenChange={setShowBroadcast} />

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Anfragen
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Auftragseingang
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Suchen (PLZ, Telefon)..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="neu">Neu</SelectItem>
            <SelectItem value="kontaktiert">Kontaktiert</SelectItem>
            <SelectItem value="angebot_gesendet">Angebot gesendet</SelectItem>
            <SelectItem value="gewonnen">Gewonnen</SelectItem>
            <SelectItem value="verloren">Verloren</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <ListSkeleton rows={3} />
      )}

      {/* Empty State - Freundlich & Hilfreich */}
      {!isLoading && filteredLeads.length === 0 && (
        <Card className="border-dashed border-2 border-border/50 bg-muted/20">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <span className="text-4xl">📬</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {leads.length === 0 ? "Noch keine Anfragen" : "Keine Treffer"}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              {leads.length === 0 
                ? "Sobald potenzielle Kunden über deine Webseite anfragen, erscheinen sie hier." 
                : "Versuche einen anderen Suchbegriff oder Filter."}
            </p>
            {leads.length === 0 && (
              <Button 
                size="lg" 
                className="px-8 h-12 text-base font-semibold"
                onClick={() => navigate('/management')}
              >
                Webseite einrichten
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead, index) => {
          const typeInfo = typeConfig[lead.lead_type] || typeConfig.frage;
          const statusInfo = statusConfig[lead.status] || statusConfig.neu;
          
          return (
            <Card
              key={lead.id}
              className="hover:shadow-lg transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={cn("font-medium gap-1", typeInfo.className)}>
                        {typeInfo.icon}
                        {typeInfo.label}
                      </Badge>
                      <Badge className={cn("font-medium", statusInfo.className)}>
                        {statusInfo.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {lead.phone && (
                        <a 
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          {lead.phone}
                        </a>
                      )}
                      {lead.postal_code && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          PLZ {lead.postal_code}
                        </span>
                      )}
                      {lead.source && (
                        <Badge variant="outline" className="text-xs">
                          via {lead.source}
                        </Badge>
                      )}
                    </div>

                    {lead.message && (
                      <p className="text-muted-foreground flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {lead.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {lead.status === 'neu' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: lead.id, status: 'kontaktiert' })}
                      >
                        Als kontaktiert markieren
                      </Button>
                    )}
                    {isWhatsApp && lead.phone && (
                      <Button 
                        size="sm"
                        className="gap-1 bg-[#F5970A] hover:bg-[#F5970A]/90 text-white"
                        onClick={() => {
                          openWhatsApp(lead.phone!, waTextLeadReply(lead.name || ""));
                          updateStatus.mutate({ id: lead.id, status: 'kontaktiert' });
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Via WhatsApp antworten
                      </Button>
                    )}
                    {lead.phone && (
                      <Button size="sm" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-4 w-4 mr-1" />
                          Anrufen
                        </a>
                      </Button>
                    )}
                    {!isWhatsApp && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (lead.name) params.set('name', lead.name);
                          if (lead.phone) params.set('phone', lead.phone);
                          if (lead.email) params.set('email', lead.email);
                          navigate(`/chat?${params.toString()}`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat starten
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
        </TabsContent>

        <TabsContent value="orders">
          <ServiceOrderInbox />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Anfragen;
