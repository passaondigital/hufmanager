import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotschafterRegistration } from "@/components/shared/BotschafterRegistration";

export default function ManagementBotschafter() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate("/management")}>
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <h1 className="text-2xl font-bold">Botschafter werden</h1>
      </div>
      <BotschafterRegistration sourceRole="provider" />
    </div>
  );
}
