import { Button } from "@/components/ui/button";

export const REVIEW_CATEGORIES = [
  "Barhuf",
  "Klebebeschlag",
  "Hufbeschlag",
  "Beratung",
  "Services",
] as const;

export type ReviewCategory = typeof REVIEW_CATEGORIES[number];

interface ReviewFilterPillsProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  availableCategories: string[];
}

export const ReviewFilterPills = ({
  selectedCategory,
  onCategoryChange,
  availableCategories,
}: ReviewFilterPillsProps) => {
  // Only show categories that have reviews
  const categoriesToShow = REVIEW_CATEGORIES.filter((cat) =>
    availableCategories.includes(cat)
  );

  if (categoriesToShow.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        size="sm"
        onClick={() => onCategoryChange(null)}
        className="rounded-full"
      >
        Alle
      </Button>
      {categoriesToShow.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category)}
          className="rounded-full"
        >
          {category}
        </Button>
      ))}
    </div>
  );
};
