import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const customers = [
  {
    kid: "Kid000001",
    name: "Anna Schmidt",
    email: "anna.schmidt@email.de",
    phone: "+49 171 1234567",
    address: "Hofweg 12, 85221 Dachau",
    horses: [
      { name: "Bella", eqid: "Eqid00000001", type: "Warmblut", nextService: "in 3 Wochen" },
      { name: "Storm", eqid: "Eqid00000002", type: "Araber", nextService: "in 5 Wochen" },
    ],
    status: "aktiv",
    totalVisits: 24,
    lastVisit: "12.11.2024",
  },
  {
    kid: "Kid000002",
    name: "Thomas Müller",
    email: "t.mueller@web.de",
    phone: "+49 172 9876543",
    address: "Bergstraße 45, 85354 Freising",
    horses: [{ name: "Blitz", eqid: "Eqid00000003", type: "Haflinger", nextService: "in 2 Wochen" }],
    status: "aktiv",
    totalVisits: 12,
    lastVisit: "28.11.2024",
  },
  {
    kid: "Kid000003",
    name: "Maria Weber",
    email: "maria.w@gmail.com",
    phone: "+49 173 5555555",
    address: "Waldring 8, 80999 München",
    horses: [
      { name: "Luna", eqid: "Eqid00000004", type: "Shetlandpony", nextService: "überfällig" },
      { name: "Sunny", eqid: "Eqid00000005", type: "Shetlandpony", nextService: "in 4 Wochen" },
      { name: "Star", eqid: "Eqid00000006", type: "Shetlandpony", nextService: "in 4 Wochen" },
    ],
    status: "überfällig",
    totalVisits: 8,
    lastVisit: "15.10.2024",
  },
  {
    kid: "Kid000004",
    name: "Stefan Braun",
    email: "s.braun@mail.de",
    phone: "+49 174 7777777",
    address: "Reitweg 3, 85375 Neufahrn",
    horses: [{ name: "Max", eqid: "Eqid00000007", type: "Kaltblut", nextService: "in 6 Wochen" }],
    status: "aktiv",
    totalVisits: 6,
    lastVisit: "25.11.2024",
  },
];

const Kunden = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.kid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "alle" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kunden</h1>
          <p className="text-muted-foreground mt-1">
            {customers.length} Kunden • {customers.reduce((acc, c) => acc + c.horses.length, 0)} Pferde
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Kunde
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kunde oder KID suchen..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="aktiv">Aktiv</SelectItem>
            <SelectItem value="überfällig">Überfällig</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {filteredCustomers.map((customer, index) => (
          <Card
            key={customer.kid}
            className="hover:shadow-lg transition-all cursor-pointer group animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {customer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-foreground">{customer.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {customer.kid}
                    </Badge>
                    <Badge
                      className={cn(
                        customer.status === "aktiv"
                          ? "bg-accent/10 text-accent"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {customer.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {customer.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {customer.address}
                    </span>
                  </div>

                  {/* Horses */}
                  <div className="flex flex-wrap gap-2">
                    {customer.horses.map((horse) => (
                      <div
                        key={horse.eqid}
                        className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5"
                      >
                        <span className="font-medium text-foreground">{horse.name}</span>
                        <span className="text-xs text-muted-foreground">({horse.type})</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            horse.nextService === "überfällig" && "border-destructive text-destructive"
                          )}
                        >
                          {horse.nextService}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {customer.totalVisits} Besuche
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Letzter: {customer.lastVisit}
                  </p>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Kunden;
