import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GalleryImage {
  id: string;
  before_url: string;
  after_url: string;
  title?: string;
  description?: string;
}

interface BeforeAfterGalleryProps {
  images: GalleryImage[];
  primaryColor?: string;
}

export function BeforeAfterGallery({ images, primaryColor = "#d97706" }: BeforeAfterGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);

  if (images.length === 0) return null;

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
      setSliderPosition(50);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
      setSliderPosition(50);
    }
  };

  const handleSliderChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1) {
      handleSliderChange(e);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card 
            key={image.id} 
            className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedIndex(index);
              setSliderPosition(50);
            }}
          >
            <CardContent className="p-0 relative aspect-[4/3]">
              {/* Before image as background */}
              <img 
                src={image.before_url} 
                alt={`Vorher - ${image.title || "Huf"}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* After image overlay (50%) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: "50%" }}
              >
                <img 
                  src={image.after_url} 
                  alt={`Nachher - ${image.title || "Huf"}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ width: "200%" }}
                />
              </div>
              {/* Divider line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: "50%" }}
              />
              {/* Labels */}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Vorher
              </div>
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Nachher
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Title */}
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white text-sm font-medium">{image.title}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95">
          {selectedIndex !== null && (
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Navigation buttons */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Before/After Comparison Slider */}
              <div 
                className="relative aspect-[4/3] cursor-ew-resize select-none"
                onMouseDown={handleSliderChange}
                onMouseMove={handleSliderMove}
              >
                {/* Before image (full) */}
                <img 
                  src={images[selectedIndex].before_url} 
                  alt="Vorher"
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  draggable={false}
                />
                {/* After image (clipped) */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img 
                    src={images[selectedIndex].after_url} 
                    alt="Nachher"
                    className="absolute inset-0 h-full object-contain bg-black"
                    style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: "none" }}
                    draggable={false}
                  />
                </div>
                {/* Slider handle */}
                <div 
                  className="absolute top-0 bottom-0 w-1 cursor-ew-resize"
                  style={{ 
                    left: `${sliderPosition}%`, 
                    transform: "translateX(-50%)",
                    backgroundColor: primaryColor 
                  }}
                >
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <ChevronLeft className="h-4 w-4 text-white -mr-1" />
                    <ChevronRight className="h-4 w-4 text-white -ml-1" />
                  </div>
                </div>
                {/* Labels */}
                <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-3 py-1.5 rounded-full">
                  Vorher
                </div>
                <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-3 py-1.5 rounded-full">
                  Nachher
                </div>
              </div>

              {/* Title and description */}
              {(images[selectedIndex].title || images[selectedIndex].description) && (
                <div className="p-4 text-white">
                  {images[selectedIndex].title && (
                    <h3 className="text-lg font-semibold">{images[selectedIndex].title}</h3>
                  )}
                  {images[selectedIndex].description && (
                    <p className="text-white/70 mt-1">{images[selectedIndex].description}</p>
                  )}
                </div>
              )}

              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="flex justify-center gap-2 pb-4">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === selectedIndex ? "bg-white" : "bg-white/40"
                      }`}
                      onClick={() => {
                        setSelectedIndex(idx);
                        setSliderPosition(50);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
