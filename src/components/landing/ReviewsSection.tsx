import { useState, useMemo } from "react";
import { Star, Quote, MessageSquare } from "lucide-react";
import { ReviewsGrid, ReviewsCarousel, ReviewsMarquee, ReviewFilterPills, Review } from "./reviews";

export type ReviewsLayout = "grid" | "carousel" | "marquee";

interface ReviewsSectionProps {
  reviews: Review[];
  primaryColor?: string;
  layout?: ReviewsLayout;
}

export const ReviewsSection = ({
  reviews,
  primaryColor = "#F47B20",
  layout = "grid",
}: ReviewsSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get available categories from reviews
  const availableCategories = useMemo(() => {
    const categories = reviews
      .map((r) => r.category)
      .filter((c): c is string => !!c);
    return [...new Set(categories)];
  }, [reviews]);

  // Filter reviews by selected category
  const filteredReviews = useMemo(() => {
    if (!selectedCategory) return reviews;
    return reviews.filter((r) => r.category === selectedCategory);
  }, [reviews, selectedCategory]);

  if (!reviews || reviews.length === 0) return null;

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  const renderLayout = () => {
    switch (layout) {
      case "carousel":
        return <ReviewsCarousel reviews={filteredReviews} primaryColor={primaryColor} />;
      case "marquee":
        return <ReviewsMarquee reviews={filteredReviews} primaryColor={primaryColor} />;
      case "grid":
      default:
        return <ReviewsGrid reviews={filteredReviews} primaryColor={primaryColor} />;
    }
  };

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

        {/* Filter pills - only show if there are categories */}
        {availableCategories.length > 0 && (
          <ReviewFilterPills
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            availableCategories={availableCategories}
          />
        )}

        {/* Render based on layout */}
        {filteredReviews.length > 0 ? (
          renderLayout()
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Keine Bewertungen in dieser Kategorie.
          </p>
        )}

        {/* Engagement hint - only for grid layout */}
        {layout === "grid" && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Klicke auf die Reaktionen, um deine Meinung zu teilen
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
