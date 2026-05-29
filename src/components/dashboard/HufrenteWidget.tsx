import { Shield, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useHufrenteStats } from "@/hooks/useHufrenteStats";
import { useDachConfig } from "@/hooks/useDachConfig";

export function HufrenteWidget() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useHufrenteStats();
  const { formatCurrency } = useDachConfig();

  if (isLoading) return null;

  const hasReferrals = (stats?.totalReferred || 0) > 0;

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 active:scale-[0.99] transition-all"
      onClick={() => navigate("/hufrente")}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {hasReferrals ? (
              <>
                <p className="text-sm font-semibold text-foreground">Deine Hufrente</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stats!.activeReferrals} aktive Empfehlung{stats!.activeReferrals !== 1 ? "en" : ""} ·{" "}
                  {formatCurrency(stats!.monthlyCommission)}/Monat
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">Hufrente aktivieren</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sichere dein Einkommen ab — empfiehl Hufi und verdiene dauerhaft.
                </p>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
