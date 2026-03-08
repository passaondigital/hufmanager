import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionEditPanelsProps {
  editor: any;
}

export const SectionEditPanels = ({ editor }: SectionEditPanelsProps) => {
  const { activeSection, settings, updateSetting } = editor;
  if (!activeSection) return null;

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {activeSection === "hero" && <HeroEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "about" && <AboutEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "trust_counters" && <TrustCountersEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "reviews" && <ReviewsEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "contact" && <ContactEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "faq" && <FAQInlineHint />}
      {activeSection === "service_area" && <ServiceAreaEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "qualifications" && <QualificationsEditor settings={settings} updateSetting={updateSetting} />}
      {activeSection === "gallery" && <GalleryHint />}
      {(activeSection === "highlights" || activeSection === "services" || activeSection === "list_items") && <ServicesHint />}
      {activeSection === "instagram" && <InstagramHint />}
      {activeSection === "before_after" && <GalleryHint />}
    </div>
  );
};

// ─── HERO ─────────────────────────────────────────
function HeroEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">🏠 Hero / Header</h4>
      <div className="space-y-2">
        <Label className="text-xs">Überschrift</Label>
        <Input
          placeholder="z.B. Hufpflege Musterhausen"
          value={settings.hero_headline}
          onChange={(e) => updateSetting("hero_headline", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Geschäftsname</Label>
        <Input
          placeholder="Mein Betrieb"
          value={settings.business_name}
          onChange={(e) => updateSetting("business_name", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Inhaber-Name</Label>
        <Input
          placeholder="Max Mustermann"
          value={settings.owner_name}
          onChange={(e) => updateSetting("owner_name", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Kundenannahme</Label>
        <div className="flex gap-2">
          {["open", "waitlist", "closed"].map((status) => (
            <Button
              key={status}
              variant={settings.client_intake_status === status ? "default" : "outline"}
              size="sm"
              onClick={() => updateSetting("client_intake_status", status)}
              className="text-xs"
            >
              {status === "open" ? "✅ Offen" : status === "waitlist" ? "⏳ Warteliste" : "🚫 Geschlossen"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT ────────────────────────────────────────
function AboutEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">👤 Über mich</h4>
      <div className="space-y-2">
        <Label className="text-xs">Text (HTML möglich)</Label>
        <Textarea
          rows={5}
          placeholder="Erzähle über dich und deine Arbeit..."
          value={settings.about_text}
          onChange={(e) => updateSetting("about_text", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Adresse</Label>
        <Input
          placeholder="Musterstr. 1, 12345 Stadt"
          value={settings.address}
          onChange={(e) => updateSetting("address", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── TRUST COUNTERS ───────────────────────────────
function TrustCountersEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">📊 Vertrauens-Zähler</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Jahre Erfahrung</Label>
          <Input
            type="number"
            value={settings.years_experience || ""}
            onChange={(e) => updateSetting("years_experience", parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Behandelte Pferde</Label>
          <Input
            type="number"
            value={settings.horses_treated || ""}
            onChange={(e) => updateSetting("horses_treated", parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Einzugsgebiet km</Label>
          <Input
            type="number"
            value={settings.service_area_km || ""}
            onChange={(e) => updateSetting("service_area_km", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── REVIEWS ──────────────────────────────────────
function ReviewsEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">⭐ Bewertungen</h4>
      <div className="space-y-2">
        <Label className="text-xs">Anzeige-Layout</Label>
        <div className="flex gap-2">
          {[
            { value: "grid", label: "Grid" },
            { value: "carousel", label: "Slider" },
            { value: "marquee", label: "Laufband" },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={settings.reviews_layout === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => updateSetting("reviews_layout", opt.value)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Bewertungen werden unter Bewertungen → Meine Rezensionen verwaltet.
      </p>
    </div>
  );
}

// ─── CONTACT ──────────────────────────────────────
function ContactEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">📞 Kontakt</h4>
      <div className="space-y-2">
        <Label className="text-xs">Telefon</Label>
        <Input
          placeholder="+49 170 1234567"
          value={settings.phone}
          onChange={(e) => updateSetting("phone", e.target.value)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">WhatsApp-Button</Label>
        <Switch
          checked={settings.whatsapp_enabled}
          onCheckedChange={(v) => updateSetting("whatsapp_enabled", v)}
        />
      </div>
      {settings.whatsapp_enabled && (
        <div className="space-y-2">
          <Label className="text-xs">WhatsApp-Nummer</Label>
          <Input
            placeholder="+49 170 1234567"
            value={settings.whatsapp_number}
            onChange={(e) => updateSetting("whatsapp_number", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// ─── SERVICE AREA ─────────────────────────────────
function ServiceAreaEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">📍 Einzugsgebiet</h4>
      <div className="space-y-2">
        <Label className="text-xs">Beschreibung</Label>
        <Textarea
          rows={3}
          placeholder="Ich fahre im Umkreis von 50km um..."
          value={settings.service_area_text}
          onChange={(e) => updateSetting("service_area_text", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Radius (km)</Label>
        <Input
          type="number"
          value={settings.service_area_km || ""}
          onChange={(e) => updateSetting("service_area_km", parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}

// ─── QUALIFICATIONS ───────────────────────────────
function QualificationsEditor({ settings, updateSetting }: { settings: any; updateSetting: any }) {
  const quals: { title: string; year: string; institution?: string }[] = settings.qualifications || [];

  const add = () => updateSetting("qualifications", [...quals, { title: "", year: "", institution: "" }]);
  const remove = (i: number) => updateSetting("qualifications", quals.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, value: string) =>
    updateSetting("qualifications", quals.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">🎓 Qualifikationen</h4>
      {quals.map((q, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Input placeholder="Jahr" value={q.year} onChange={(e) => update(i, "year", e.target.value)} className="w-16 text-xs" />
          <Input placeholder="Titel" value={q.title} onChange={(e) => update(i, "title", e.target.value)} className="flex-1 text-xs" />
          <Button variant="ghost" size="icon" onClick={() => remove(i)} className="h-8 w-8 shrink-0">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      {quals.length < 10 && (
        <Button variant="outline" size="sm" onClick={add} className="w-full gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" /> Hinzufügen
        </Button>
      )}
    </div>
  );
}

// ─── HINTS (for sections managed elsewhere) ───────
function FAQInlineHint() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">❓ FAQ</h4>
      <p className="text-xs text-muted-foreground">
        FAQs werden unter <strong>Inhalte → FAQ</strong> verwaltet. Hier nur die Sichtbarkeit umschalten.
      </p>
    </div>
  );
}

function GalleryHint() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">🖼 Galerie</h4>
      <p className="text-xs text-muted-foreground">
        Galerie-Bilder werden automatisch aus deinen Huf-Fotos erstellt. Du kannst sie unter <strong>Pferdeakte → Fotos</strong> hochladen.
      </p>
    </div>
  );
}

function ServicesHint() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">⭐ Leistungen</h4>
      <p className="text-xs text-muted-foreground">
        Leistungen und Preise werden unter <strong>Inhalte → Leistungen</strong> oder <strong>Einstellungen → Services</strong> verwaltet.
      </p>
    </div>
  );
}

function InstagramHint() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">📸 Instagram</h4>
      <p className="text-xs text-muted-foreground">
        Der Instagram-Feed zeigt manuell hinterlegte Bilder. Verwalte sie unter <strong>Einstellungen → Social Media</strong>.
      </p>
    </div>
  );
}
