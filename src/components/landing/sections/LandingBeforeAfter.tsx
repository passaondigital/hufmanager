import { Camera } from "lucide-react";
import { BeforeAfterGallery } from "@/components/landing/BeforeAfterGallery";

interface GalleryImage {
  id: string;
  before_url: string;
  after_url: string;
  title?: string;
  description?: string;
}

interface LandingBeforeAfterProps {
  galleryImages: GalleryImage[];
  primaryColor: string;
}

export const LandingBeforeAfter = ({ galleryImages, primaryColor }: LandingBeforeAfterProps) => (
  <section className="py-16 px-4 bg-muted/30">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Camera className="h-4 w-4" />
          Bildergalerie
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Vorher & Nachher</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Überzeugen Sie sich selbst von den Ergebnissen meiner Arbeit
        </p>
      </div>
      <BeforeAfterGallery images={galleryImages} primaryColor={primaryColor} />
    </div>
  </section>
);
