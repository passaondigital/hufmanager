import { MessageSquare, Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const EmployeeChat = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Chat
        </h1>
        <p className="text-sm text-muted-foreground">Kommunikation mit deinem Provider</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Construction className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">In Entwicklung</p>
          <p className="text-sm">Der Mitarbeiter-Chat wird in Kürze freigeschaltet.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeChat;
