import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface ServiceListItemProps {
  title: string;
  description: string | null;
  price: number | null;
  priceType: string | null;
  externalLink?: string | null;
  primaryColor?: string;
}

export const ServiceListItem = ({
  title,
  description,
  price,
  priceType,
  externalLink,
  primaryColor = "#F47B20",
}: ServiceListItemProps) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground">{title}</h4>
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
        {price !== null ? (
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
