import { MapPin } from "lucide-react";

interface LandingServiceAreaProps {
  serviceAreaText: string;
  primaryColor: string;
}

export const LandingServiceArea = ({ serviceAreaText, primaryColor }: LandingServiceAreaProps) => {
  if (!serviceAreaText) return null;

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin className="h-4 w-4" />
          Einzugsgebiet
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Mein Tätigkeitsgebiet</h2>
        <div className="inline-flex items-center gap-3 bg-card border rounded-xl px-6 py-4 shadow-sm">
          <MapPin className="h-6 w-6 flex-shrink-0" style={{ color: primaryColor }} />
          <p className="text-lg text-foreground">{serviceAreaText}</p>
        </div>
      </div>
    </section>
  );
};
