import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const customers = [
  {
    id: "Kid000001",
    name: "Anna Schmidt",
    horses: 2,
    lastVisit: "vor 3 Tagen",
    status: "aktiv",
  },
  {
    id: "Kid000002",
    name: "Thomas Müller",
    horses: 1,
    lastVisit: "vor 1 Woche",
    status: "aktiv",
  },
  {
    id: "Kid000003",
    name: "Maria Weber",
    horses: 3,
    lastVisit: "vor 2 Wochen",
    status: "überfällig",
  },
  {
    id: "Kid000004",
    name: "Stefan Braun",
    horses: 1,
    lastVisit: "vor 5 Tagen",
    status: "aktiv",
  },
];

export function RecentCustomers() {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Letzte Kunden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                  {customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.horses} Pferd{customer.horses > 1 ? "e" : ""} • {customer.lastVisit}
                </p>
              </div>
            </div>
            <Badge
              variant={customer.status === "aktiv" ? "default" : "destructive"}
              className={customer.status === "aktiv" ? "bg-accent/10 text-accent hover:bg-accent/20" : ""}
            >
              {customer.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
