import { ReviewCard, Review } from "./ReviewCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

interface ReviewsCarouselProps {
  reviews: Review[];
  primaryColor: string;
}

export const ReviewsCarousel = ({ reviews, primaryColor }: ReviewsCarouselProps) => {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {reviews.map((review) => (
          <CarouselItem key={review.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/2">
            <ReviewCard review={review} primaryColor={primaryColor} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-4 md:-left-12" />
      <CarouselNext className="-right-4 md:-right-12" />
    </Carousel>
  );
};
