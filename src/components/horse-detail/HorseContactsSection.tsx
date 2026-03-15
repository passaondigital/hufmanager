import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Pencil, User, Stethoscope, Home, GraduationCap, CheckCircle, Link } from "lucide-react";
import type { HorseContacts } from "./types";
import { useLinkedPartners, type LinkedPartner } from "@/hooks/useLinkedPartners";
import { getPartnerTypeConfig } from "@/lib/partnerTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface HorseContactsSectionProps {
  contacts: HorseContacts | null;
  onEdit?: () => void;
  editable?: boolean;
  horseId?: string;
}

interface ContactRowProps {
  icon: React.ReactNode;
  label: string;
  name?: string | null;
  phone?: string | null;
  isVerified?: boolean;
}

function ContactRow({ icon, label, name, phone, isVerified }: ContactRowProps) {
  if (!name && !phone) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground truncate">{name || "—"}</p>
            {isVerified && (
              <Badge variant="secondary" className="text-[9px] gap-0.5 px-1.5 py-0">
                <CheckCircle className="h-2.5 w-2.5" />
                Verifiziert
              </Badge>
            )}
          </div>
        </div>
      </div>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-1 text-sm text-primary hover:underline flex-shrink-0"
        >
          <Phone className="h-3.5 w-3.5" />
          {phone}
        </a>
      )}
    </div>
  );
}

function UnlinkedPartnerHint({
  partner,
  horseId,
}: {
  partner: LinkedPartner;
  horseId: string;
}) {
  const queryClient = useQueryClient();
  const config = getPartnerTypeConfig(partner.partnerType);

  const handleLink = async () => {
    if (!partner.contactKey || !partner.partnerProfileId) return;
    const profileIdField = `${partner.contactKey}_partner_profile_id`;

    // Read current contacts
    const { data: horse } = await supabase
      .from("horses")
      .select("contacts")
      .eq("id", horseId)
      .single();

    const contacts = (horse?.contacts as Record<string, any>) || {};
    contacts[profileIdField] = partner.partnerProfileId;
    if (!contacts[partner.contactKey]) {
      contacts[partner.contactKey] = partner.partnerName;
    }

    const { error } = await supabase
      .from("horses")
      .update({ contacts })
      .eq("id", horseId);

    if (error) {
      toast.error("Fehler beim Verlinken");
    } else {
      toast.success("Partner verlinkt");
      queryClient.invalidateQueries({ queryKey: ["linked-partners", horseId] });
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <config.icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
        <span className="text-foreground truncate">
          <strong>{partner.partnerName}</strong>{" "}
          <span className="text-muted-foreground">({config.label}) ist als Partner verknüpft</span>
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={handleLink} className="flex-shrink-0 gap-1">
        <Link className="h-3 w-3" />
        Verlinken
      </Button>
    </div>
  );
}

export function HorseContactsSection({ contacts, onEdit, editable = false, horseId }: HorseContactsSectionProps) {
  const c = contacts || {};
  const hasAny = c.vet || c.vet_phone || c.trainer || c.trainer_phone || c.stable || c.stable_phone || c.caretaker || c.caretaker_phone;

  const { data: linkedPartners } = useLinkedPartners(horseId || "", contacts);
  const unlinkedPartners = linkedPartners?.filter((p) => !p.isLinkedInContacts && p.contactKey && p.partnerProfileId) || [];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between group">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          Kontakte & Notfall
          <span className="flex-1 h-px bg-border ml-2" />
        </CardTitle>
        {editable && onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="h-4 w-4 mr-1" />
            Bearbeiten
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {hasAny ? (
          <div>
            <ContactRow
              icon={<Stethoscope className="h-4 w-4 text-primary" />}
              label="Tierarzt"
              name={c.vet}
              phone={c.vet_phone}
              isVerified={!!c.vet_partner_profile_id}
            />
            <ContactRow
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
              label="Trainer"
              name={c.trainer}
              phone={c.trainer_phone}
              isVerified={!!c.trainer_partner_profile_id}
            />
            <ContactRow
              icon={<Home className="h-4 w-4 text-primary" />}
              label="Stallbetreiber"
              name={c.stable}
              phone={c.stable_phone}
              isVerified={!!c.stable_partner_profile_id}
            />
            <ContactRow
              icon={<User className="h-4 w-4 text-primary" />}
              label="Betreuer"
              name={c.caretaker}
              phone={c.caretaker_phone}
              isVerified={!!c.caretaker_partner_profile_id}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Noch keine Kontakte hinterlegt
          </p>
        )}

        {/* Unlinked partner suggestions */}
        {unlinkedPartners.length > 0 && horseId && (
          <div className="space-y-2 pt-2">
            {unlinkedPartners.map((p) => (
              <UnlinkedPartnerHint key={p.accessId} partner={p} horseId={horseId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
