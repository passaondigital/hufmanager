import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryImage {
  url: string;
  caption?: string;
}

interface GallerySectionProps {
  images: GalleryImage[];
  primaryColor?: string;
}

export const GallerySection = ({ images, primaryColor = "#F47B20" }: GallerySectionProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const goNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % images.length);
    }
  };

  const goPrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Camera className="h-4 w-4" />
            Galerie
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Meine Arbeit</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Einblicke in meine tägliche Arbeit mit Pferden
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.caption || `Bild ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm truncate">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </Button>

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {selectedIndex !== null && (
              <div className="flex flex-col items-center p-4">
                <img
                  src={images[selectedIndex].url}
                  alt={images[selectedIndex].caption || `Bild ${selectedIndex + 1}`}
                  className="max-h-[70vh] max-w-full object-contain rounded"
                />
                {images[selectedIndex].caption && (
                  <p className="text-white mt-4 text-center">{images[selectedIndex].caption}</p>
                )}
                <p className="text-white/60 text-sm mt-2">
                  {selectedIndex + 1} / {images.length}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
