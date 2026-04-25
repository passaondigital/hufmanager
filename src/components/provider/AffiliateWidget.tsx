import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Share2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface AffiliateWidgetProps {
  affiliateCode?: string;
  conversions?: number;
  earnings?: number;
}

export function AffiliateWidget({ affiliateCode = "", conversions = 0, earnings = 0 }: AffiliateWidgetProps) {
  const link = `https://hufiapp.de/?ref=${affiliateCode}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link kopiert!");
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: "HufManager empfehlen", url: link });
    } else {
      copy();
    }
  };

  if (!affiliateCode) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Empfehle HufManager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Teile deinen persönlichen Link und verdiene Provision!</p>
        <div className="flex gap-2">
          <code className="flex-1 bg-muted px-3 py-2 rounded text-xs truncate">{link}</code>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" onClick={share}><Share2 className="w-4 h-4" /></Button>
        </div>
        <div className="flex justify-between text-sm pt-2">
          <span className="text-muted-foreground">Conversions: <strong>{conversions}</strong></span>
          <span className="text-muted-foreground">Verdient: <strong>{(earnings / 100).toFixed(2)}€</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
