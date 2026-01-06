import { ReviewCard, Review } from "./ReviewCard";

interface ReviewsGridProps {
  reviews: Review[];
  primaryColor: string;
}

export const ReviewsGrid = ({ reviews, primaryColor }: ReviewsGridProps) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} primaryColor={primaryColor} />
      ))}
    </div>
  );
};
