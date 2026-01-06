import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Clock, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceListItemProps {
  title: string;
  description: string | null;
  price: number | null;
  priceType: string | null;
  externalLink?: string | null;
  primaryColor?: string;
  billingType?: string | null;
}

const BILLING_ICONS: Record<string, React.ReactNode> = {
  einmalig: null,
  abo: <RefreshCw className="h-3 w-3" />,
  stuendlich: <Clock className="h-3 w-3" />,
  kostenlos: <Gift className="h-3 w-3" />,
};

const BILLING_LABELS: Record<string, string> = {
  einmalig: "Einmalig",
  abo: "Abo",
  stuendlich: "Stündlich",
  kostenlos: "Kostenlos",
};

const BILLING_COLORS: Record<string, string> = {
  einmalig: "bg-muted text-muted-foreground",
  abo: "bg-primary/10 text-primary",
  stuendlich: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  kostenlos: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const ServiceListItem = ({
  title,
  description,
  price,
  priceType,
  externalLink,
  primaryColor = "#F47B20",
  billingType = "einmalig",
}: ServiceListItemProps) => {
  const billing = billingType || "einmalig";

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">{title}</h4>
          {billing && billing !== "einmalig" && (
            <Badge className={cn("gap-1 text-xs border-0", BILLING_COLORS[billing])}>
              {BILLING_ICONS[billing]}
              {BILLING_LABELS[billing]}
            </Badge>
          )}
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      
      <div className="flex-shrink-0 text-right ml-4">
        {billing === "kostenlos" ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
            Gratis
          </Badge>
        ) : price !== null ? (
          <span className="font-semibold" style={{ color: primaryColor }}>
            €{price}
            {priceType && <span className="text-xs text-muted-foreground ml-1">/{priceType}</span>}
          </span>
        ) : (
          <Badge variant="secondary" className="text-xs">Auf Anfrage</Badge>
        )}
      </div>
    </div>
  );
};
