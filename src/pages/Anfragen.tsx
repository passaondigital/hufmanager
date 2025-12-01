import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MessageSquare, Phone, Mail, MapPin, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const leads = [
  {
    id: 1,
    name: "Julia Hoffmann",
    email: "julia.h@email.de",
    phone: "+49 171 1234567",
    message: "Hallo, ich suche einen Hufbearbeiter für meine zwei Pferde. Wann hätten Sie Zeit?",
    horses: 2,
    location: "München Nord",
    status: "neu",
    date: "vor 2 Stunden",
  },
  {
    id: 2,
    name: "Peter Wagner",
    email: "p.wagner@mail.com",
    phone: "+49 172 9876543",
    message: "Mein Pferd braucht dringend eine Korrektur. Können Sie zeitnah kommen?",
    horses: 1,
    location: "Freising",
    status: "kontaktiert",
    date: "vor 1 Tag",
  },
  {
    id: 3,
    name: "Sandra Klein",
    email: "sandra.klein@web.de",
    phone: "+49 173 5555555",
    message: "Ich interessiere mich für regelmäßige Hufpflege für drei Ponys.",
    horses: 3,
    location: "Dachau",
    status: "angebot_gesendet",
    date: "vor 3 Tagen",
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  neu: { label: "Neu", className: "bg-primary/10 text-primary" },
  kontaktiert: { label: "Kontaktiert", className: "bg-blue-500/10 text-blue-600" },
  angebot_gesendet: { label: "Angebot gesendet", className: "bg-amber-500/10 text-amber-600" },
  gewonnen: { label: "Gewonnen", className: "bg-accent/10 text-accent" },
  verloren: { label: "Verloren", className: "bg-muted text-muted-foreground" },
};

const Anfragen = () => {
  const [filter, setFilter] = useState("alle");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anfragen</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie neue Kundenanfragen und Leads
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {leads.filter((l) => l.status === "neu").length} Neue
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." className="pl-10" />
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
          </SelectContent>
        </Select>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {leads.map((lead, index) => (
          <Card
            key={lead.id}
            className="hover:shadow-lg transition-shadow cursor-pointer animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{lead.name}</h3>
                    <Badge className={cn("font-medium", statusConfig[lead.status].className)}>
                      {statusConfig[lead.status].label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{lead.date}</span>
                  </div>

                  <p className="text-muted-foreground flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {lead.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {lead.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {lead.location}
                    </span>
                    <Badge variant="outline">{lead.horses} Pferd{lead.horses > 1 ? "e" : ""}</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Kontaktieren
                  </Button>
                  <Button size="sm">Angebot erstellen</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Anfragen;
