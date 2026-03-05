import { useEmployeeProfile } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, ExternalLink } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const EmployeeVertrag = () => {
  const { data: profile } = useEmployeeProfile();

  if (!profile) return null;

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Mein Vertrag
        <HelpTip id="mitarbeiter.vertrag" />
      </h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">
                {profile.employment_type === "contractor" ? "Freier Mitarbeitervertrag" : "Arbeitsvertrag"}
              </p>
              <Badge variant="secondary" className="text-xs mt-0.5">
                {profile.employment_type === "contractor" ? "Selbstständig" : "Angestellt"}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {profile.contract_start_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Beginn: {format(new Date(profile.contract_start_date), "dd.MM.yyyy", { locale: de })}</span>
              </div>
            )}
            {profile.contract_end_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Ende: {format(new Date(profile.contract_end_date), "dd.MM.yyyy", { locale: de })}</span>
              </div>
            )}
          </div>

          {profile.contract_pdf_url ? (
            <Button
              className="w-full gap-2"
              onClick={() => window.open(profile.contract_pdf_url!, "_blank")}
            >
              <Download className="h-4 w-4" />
              Vertrag herunterladen
            </Button>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Kein Vertragsdokument hinterlegt.</p>
              <p className="text-xs">Dein Provider kann ein PDF hochladen.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeVertrag;
