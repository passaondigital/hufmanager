import { Card, CardContent } from "@/components/ui/card";
import { Phone, AlertCircle } from "lucide-react";

interface EmergencyContact {
  role: string;
  name: string;
  phone: string;
}

interface EmergencyVetWidgetProps {
  contacts: EmergencyContact[];
}

export function EmergencyVetWidget({ contacts }: EmergencyVetWidgetProps) {
  // Find veterinarian or clinic contact
  const vetContact = contacts.find(
    (c) => c.role === "tierarzt" || c.role === "klinik"
  );

  if (!vetContact) {
    return null;
  }

  const formatPhoneLink = (phone: string) => {
    return `tel:${phone.replace(/\s/g, "")}`;
  };

  return (
    <Card className="bg-red-500/10 border-red-500/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500 text-white rounded-full">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
              Notfall-Tierarzt
            </p>
            <p className="font-semibold truncate">{vetContact.name}</p>
          </div>
          <a
            href={formatPhoneLink(vetContact.phone)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors active:scale-95"
          >
            <Phone className="h-4 w-4" />
            Anrufen
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
