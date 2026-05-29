import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  onComplete: () => void;
}

export const WebsiteOnboarding = ({ onComplete }: Props) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Globe className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Meine Website</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Du brauchst kein Wix. Du brauchst kein WordPress. Du brauchst keine Agentur für 2.000€.
        </p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-lg text-foreground">Mit Hufi bekommst du eine Website die:</h2>
          <ul className="space-y-3">
            {[
              "Automatisch mit deinen Kundendaten verbunden ist",
              "Termine direkt buchbar macht",
              "Bewertungen automatisch anzeigt",
              "SEO-optimiert für 'Hufpfleger [deine Stadt]' ist",
              "DSGVO-konform ist — ohne Extra-Plugin",
              "Auf deinem Handy editierbar ist",
              "In 15 Minuten live geht",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground pt-2">
            Ein Login. Alles drin. Kein Hin-und-Her zwischen Website und Terminkalender.
          </p>
        </CardContent>
      </Card>

      {/* Comparison table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Vergleich</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground"></th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Wix / WP</th>
                  <th className="text-center py-2 font-medium text-primary">Hufi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["Preis", "15-50€/M", "Im Abo ✓"],
                  ["Setup-Zeit", "Stunden", "15 Min ✓"],
                  ["Termine integriert", "❌ Plugin", "✅ Direkt"],
                  ["Kundendaten sync", "❌", "✅ Auto"],
                  ["Bewertungen sync", "❌", "✅ Auto"],
                  ["DSGVO-Plugin", "✅ Extra", "❌ Inklusive"],
                  ["Pferde-Branche", "❌", "✅ Spezialisiert"],
                ].map(([feature, wix, hm]) => (
                  <tr key={feature}>
                    <td className="py-2 font-medium text-foreground">{feature}</td>
                    <td className="py-2 text-center text-muted-foreground">{wix}</td>
                    <td className="py-2 text-center text-primary font-medium">{hm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full gap-2" onClick={onComplete}>
        Jetzt meine Website erstellen
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  );
};
