import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Scissors, Hammer, Stethoscope, Sparkles, Wrench, Shield } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string | null;
  price: number | null;
  priceType: string | null;
  features: string[] | null;
  icon?: string;
  primaryColor?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  scissors: <Scissors className="h-6 w-6" />,
  hammer: <Hammer className="h-6 w-6" />,
  stethoscope: <Stethoscope className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
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
  primaryColor = "#d97706",
}: ServiceCardProps) {
  const IconComponent = iconMap[icon] || iconMap.scissors;

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30 group">
      <CardHeader className="text-center pb-2">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
        >
          {IconComponent}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {price !== null && (
          <div className="mt-2">
            <span className="text-3xl font-bold" style={{ color: primaryColor }}>
              {price}€
            </span>
            {priceType && (
              <span className="text-sm text-muted-foreground ml-1">/ {priceType}</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="text-center">
        {description && (
          <p className="text-muted-foreground text-sm mb-4">{description}</p>
        )}
        {features && features.length > 0 && (
          <ul className="space-y-2 text-left">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  style={{ color: primaryColor }}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}