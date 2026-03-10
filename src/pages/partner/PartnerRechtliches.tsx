import { Shield } from "lucide-react";
import { RoleAVVSigningCard } from "@/components/settings/RoleAVVSigningCard";

export default function PartnerRechtliches() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Rechtliches
        </h1>
        <p className="text-sm text-muted-foreground">
          Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO
        </p>
      </div>

      <RoleAVVSigningCard role="partner" />
    </div>
  );
}
