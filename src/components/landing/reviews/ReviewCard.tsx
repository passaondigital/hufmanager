import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewReactions } from "../ReviewReactions";
import { ProofImageAttachment } from "../ProofImageOverlay";

const sourceLabels: Record<string, string> = {
  App: "App",
  WhatsApp: "WhatsApp",
  Google: "Google",
  Email: "E-Mail",
};

export interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string | null;
  created_at: string;
  source?: string;
  proof_image_url?: string;
  reactions?: { green: number; yellow: number; red: number };
  category?: string;
}

interface ReviewCardProps {
  review: Review;
  primaryColor: string;
}

export const ReviewCard = ({ review, primaryColor }: ReviewCardProps) => {
  return (
    <Card className="bg-muted/20 hover:bg-muted/30 transition-colors h-full">
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
          <div className="flex items-center gap-2">
            {review.category && (
              <Badge variant="secondary" className="text-xs">
                {review.category}
              </Badge>
            )}
            {review.source && (
              <Badge variant="outline" className="text-xs">
                {sourceLabels[review.source] || review.source}
              </Badge>
            )}
          </div>
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
        
        {/* Proof Image Attachment */}
        {review.proof_image_url && (
          <ProofImageAttachment proofImageUrl={review.proof_image_url} />
        )}
      </CardContent>
    </Card>
  );
};
