import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, Sparkles, Package, ShoppingBag, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfferCardProps {
  title: string;
  description: string | null;
  price: number | null;
  priceType: string | null;
  features: string[] | null;
  offerType?: string;
  mediaUrl?: string | null;
  externalLink?: string | null;
  primaryColor?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  service: <Sparkles className="h-4 w-4" />,
  product: <Package className="h-4 w-4" />,
  digital: <ShoppingBag className="h-4 w-4" />,
  bundle: <Layers className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  service: "Service",
  product: "Produkt",
  digital: "Digital",
  bundle: "Bundle",
};

// Extract YouTube video ID from various URL formats
const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const OfferCard = ({
  title,
  description,
  price,
  priceType,
  features,
  offerType = "service",
  mediaUrl,
  externalLink,
  primaryColor = "#F47B20",
}: OfferCardProps) => {
  const youtubeId = mediaUrl ? getYouTubeId(mediaUrl) : null;
  const isImageUrl = mediaUrl && !youtubeId && (mediaUrl.startsWith("http") || mediaUrl.startsWith("/"));

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      {/* Media Section */}
      {mediaUrl && (
        <div className="relative aspect-video bg-muted">
          {youtubeId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title={title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isImageUrl ? (
            <img
              src={mediaUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
        </div>
      )}

      <CardContent className={cn("flex-1 flex flex-col", mediaUrl ? "pt-4" : "pt-6")}>
        {/* Type Badge */}
        {offerType && offerType !== "service" && (
          <Badge variant="secondary" className="w-fit mb-2 gap-1">
            {TYPE_ICONS[offerType]}
            {TYPE_LABELS[offerType] || offerType}
          </Badge>
        )}

        {/* Title & Price */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          {price !== null && (
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-bold" style={{ color: primaryColor }}>
                €{price}
              </span>
              {priceType && (
                <span className="text-xs text-muted-foreground block">/{priceType}</span>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mb-4 flex-1">{description}</p>
        )}

        {/* Features */}
        {features && features.length > 0 && (
          <ul className="space-y-1 mb-4">
            {features.slice(0, 5).map((feature, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {feature}
              </li>
            ))}
          </ul>
        )}

        {/* External Link */}
        {externalLink && (
          <Button
            variant="outline"
            className="mt-auto gap-2"
            onClick={() => window.open(externalLink, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Mehr erfahren
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
