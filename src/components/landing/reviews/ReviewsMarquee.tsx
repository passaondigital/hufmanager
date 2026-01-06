import { ReviewCard, Review } from "./ReviewCard";
import { motion } from "framer-motion";

interface ReviewsMarqueeProps {
  reviews: Review[];
  primaryColor: string;
}

export const ReviewsMarquee = ({ reviews, primaryColor }: ReviewsMarqueeProps) => {
  // Duplicate reviews for seamless infinite scroll
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <div className="overflow-hidden relative">
      {/* Gradient fade on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <motion.div
        className="flex gap-6"
        animate={{
          x: ["0%", "-50%"],
        }}
        transition={{
          x: {
            duration: reviews.length * 8,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        {duplicatedReviews.map((review, index) => (
          <div
            key={`${review.id}-${index}`}
            className="flex-shrink-0 w-[350px] md:w-[400px]"
          >
            <ReviewCard review={review} primaryColor={primaryColor} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};
