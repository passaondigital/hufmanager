import { useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProductMembership } from "@/hooks/useProductMembership";
import type { ProductKey } from "@/lib/product-membership";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";

interface ProductChoiceGateProps {
  userId: string;
  onReady: (children: React.ReactNode) => React.ReactNode;
  children: React.ReactNode;
}

export function ProductChoiceGate({ userId, onReady, children }: ProductChoiceGateProps) {
  const { resolution, loading, error, saveChoice } = useProductMembership(userId);
  const [savingProduct, setSavingProduct] = useState<ProductKey | null>(null);

  // Produktpruefung ist Teil des Startup-Lifecycles. Kein eigener sichtbarer
  // Zwischenbildschirm mehr: Auth/Rolle/Profil/Produkt bleiben fuer den Nutzer
  // ein einziger stabiler Startzustand.
  if (loading && resolution === "resolving") {
    return <AuthLoadingScreen />;
  }

  if (resolution === "unavailable" || resolution === "active") {
    return <>{onReady(children)}</>;
  }

  if (resolution === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 space-y-4">
            <div className="h-11 w-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Produktzugang nicht eindeutig</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Der Produktkontext konnte nicht sicher aufgeloest werden. Bitte spaeter erneut versuchen oder den Support kontaktieren.
              </p>
            </div>
            {error && <p className="text-xs text-muted-foreground">Status: {error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const chooseProduct = async (product: ProductKey) => {
    setSavingProduct(product);
    await saveChoice(product);
    setSavingProduct(null);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Produktentscheidung erforderlich</p>
            <h1 className="mt-2 text-3xl font-semibold">Wo moechtest du zukuenftig weiterarbeiten?</h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto">
              HufManager und HufiApp bleiben getrennte Produktkontexte. Deine bestehenden Daten und IDs bleiben erhalten.
              Es wird jetzt kein neues Abo erstellt und nichts geloescht.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ProductChoiceCard
            title="Beim HufManager bleiben"
            description="Weiter im HufManager-Kontext mit Kunden, Pferden, Touren, Pferdeakte, Hufi Hufanalyse und Buchhaltung arbeiten."
            bullets={["Bestehende HufManager-Daten bleiben erhalten", "Keine automatische Abo-Aenderung", "Slim-Migration wird danach kontrolliert fortgesetzt"]}
            disabled={Boolean(savingProduct)}
            loading={savingProduct === "HUFMANAGER"}
            onClick={() => chooseProduct("HUFMANAGER")}
          />
          <ProductChoiceCard
            title="Zur HufiApp wechseln"
            description="Den Nutzerkontext fuer HufiApp vormerken. Eine spaetere Daten- und Abo-Transition wird separat entschieden."
            bullets={["Keine physische Datenkopie in diesem Schritt", "Kein automatischer Premiumstatus", "Abo-Transition bleibt entscheidungspflichtig"]}
            disabled={Boolean(savingProduct)}
            loading={savingProduct === "HUFIAPP"}
            onClick={() => chooseProduct("HUFIAPP")}
          />
        </div>

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">
              Speichern fehlgeschlagen. Es wurde keine halbe Produktentscheidung uebernommen. Status: {error}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProductChoiceCard({
  title,
  description,
  bullets,
  disabled,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  bullets: string[];
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Card className="bg-card/95 border-border/80 shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-2">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
        <Button className="w-full gap-2" disabled={disabled} onClick={onClick}>
          {loading ? "Speichern..." : "Auswaehlen"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
