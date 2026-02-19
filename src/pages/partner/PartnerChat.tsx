import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function PartnerChat() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Chat</h1>
      <Card className="border-dashed border-2">
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Chat kommt bald</p>
          <p className="text-sm text-muted-foreground mt-1">
            Die Chat-Funktion für Fachpartner wird in Kürze verfügbar sein.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
