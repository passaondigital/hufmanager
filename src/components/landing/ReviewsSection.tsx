import { Star, Quote, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewReactions } from "./ReviewReactions";
import { ProofImageAttachment } from "./ProofImageOverlay";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string | null;
  created_at: string;
  source?: string;
  proof_image_url?: string;
  reactions?: { green: number; yellow: number; red: number };
}

interface ReviewsSectionProps {
  reviews: Review[];
  primaryColor?: string;
}

const sourceLabels: Record<string, string> = {
  App: "App",
  WhatsApp: "WhatsApp",
  Google: "Google",
  Email: "E-Mail",
};

export const ReviewsSection = ({ reviews, primaryColor = "#F47B20" }: ReviewsSectionProps) => {
  if (!reviews || reviews.length === 0) return null;

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Quote className="h-4 w-4" />
            Bewertungen
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Kundenstimmen</h2>
          
          {/* Average rating */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-5 w-5"
                  fill={star <= Math.round(averageRating) ? primaryColor : 'transparent'}
                  stroke={star <= Math.round(averageRating) ? primaryColor : 'currentColor'}
                />
              ))}
            </div>
            <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length} Bewertungen)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-muted/20 hover:bg-muted/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-4 w-4"
                        fill={star <= review.rating ? primaryColor : 'transparent'}
                        stroke={star <= review.rating ? primaryColor : 'currentColor'}
                      />
                    ))}
                  </div>
                  {review.source && (
                    <Badge variant="outline" className="text-xs">
                      {sourceLabels[review.source] || review.source}
                    </Badge>
                  )}
                </div>
                
                {review.text && review.text.trim().length > 0 && (
                  <p className="text-muted-foreground italic mb-4">"{review.text}"</p>
                )}
                
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{review.reviewer_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('de-DE', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                
                {/* Reactions */}
                <ReviewReactions
                  reviewId={review.id}
                  reactions={review.reactions || { green: 0, yellow: 0, red: 0 }}
                />
                
                {/* Proof Image Attachment - inside the card */}
                {review.proof_image_url && (
                  <ProofImageAttachment proofImageUrl={review.proof_image_url} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Engagement hint */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Klicke auf die Reaktionen, um deine Meinung zu teilen
          </p>
        </div>
      </div>
    </section>
  );
};
