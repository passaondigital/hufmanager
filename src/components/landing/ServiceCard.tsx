import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Scissors, Hammer, Stethoscope, Search, Sparkles, Wrench, Shield, Calendar, MessageSquare } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string | null;
  price: number | null;
  priceType: string | null;
  features: string[] | null;
  icon?: string;
  primaryColor?: string;
  bookingAction?: 'direct_book' | 'request_only';
  onBook?: () => void;
  onRequest?: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  scissors: <Scissors className="h-6 w-6" />,
  hammer: <Hammer className="h-6 w-6" />,
  stethoscope: <Stethoscope className="h-6 w-6" />,
  sparkles: <Search className="h-6 w-6" />,
  wrench: <Wrench className="h-6 w-6" />,
  shield: <Shield className="h-6 w-6" />,
};

export function ServiceCard({
  title,
  description,
  price,
  priceType,
  features,
  icon = "scissors",
  bookingAction = "direct_book",
  onBook,
  onRequest,
}: ServiceCardProps) {
  const IconComponent = iconMap[icon] || iconMap.scissors;

  const handleAction = () => {
    if (bookingAction === "request_only" && onRequest) {
      onRequest();
    } else if (onBook) {
      onBook();
    }
  };

  return (
    <Card className="flex flex-col border">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          {IconComponent}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {price !== null && (
          <div className="mt-2">
            <span className="text-3xl font-bold text-primary">{price}€</span>
            {priceType && (
              <span className="ml-1 text-sm text-muted-foreground">/ {priceType}</span>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">zzgl. Anfahrt</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col text-center">
        {description && (
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        )}
        {features && features.length > 0 && (
          <ul className="mb-4 space-y-2 text-left">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {(onBook || onRequest) && (
          <div className="mt-auto pt-4">
            <Button className="w-full gap-2" onClick={handleAction}>
              {bookingAction === "request_only" ? (
                <>
                  <MessageSquare className="h-4 w-4" />
                  Anfragen
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Buchen
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}