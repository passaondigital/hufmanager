import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, ExternalLink, Plus, Loader2 } from "lucide-react";
import { useEmailLists } from "../hooks/useEmailLists";
import { useSignupForms } from "../hooks/useSignupForms";
import { toast } from "sonner";

export function LeadsTab() {
  const { lists, isLoading: listsLoading, createList } = useEmailLists();
  const { forms, createForm } = useSignupForms();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncListId, setSyncListId] = useState("");
  const [formFields, setFormFields] = useState({
    email: true,
    first_name: false,
    last_name: false,
    postal_code: false,
  });
  const [formName, setFormName] = useState("");
  const [selectedListId, setSelectedListId] = useState("");
  const [createdForm, setCreatedForm] = useState<any>(null);
  const [newListName, setNewListName] = useState("");

  const handleCreateForm = async () => {
    if (!selectedListId) return toast.error("Bitte wähle eine Ziel-Liste aus");
    if (!formName.trim()) return toast.error("Bitte gib einen Formularnamen ein");
    const slug = formName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50) + "-" + Date.now().toString(36);
    try {
      const result = await createForm.mutateAsync({
        name: formName,
        list_id: selectedListId,
        slug,
        fields_config: formFields,
      });
      setCreatedForm(result);
      toast.success("Formular erstellt!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const baseUrl = window.location.origin;

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-4">
      {/* Left Column */}
      <div className="space-y-4">
        {/* Neue Liste erstellen */}
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-black">Neue Liste erstellen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="z.B. Interessenten, Bestandskunden..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="bg-white"
              />
              <Button
                className="bg-[#F47B20] hover:bg-[#e06a10] text-white shrink-0"
                onClick={async () => {
                  if (!newListName.trim()) return;
                  await createList.mutateAsync({ name: newListName });
                  setNewListName("");
                  toast.success("Liste erstellt!");
                }}
                disabled={createList.isPending}
              >
                {createList.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {lists.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {lists.length} Liste(n): {lists.map(l => l.name).join(", ")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Landingpage Sync */}
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-black">Hufi Landingpage Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-black">Kontakte aus dem internen Kontaktformular automatisch importieren</Label>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>
            {syncEnabled && (
              <Select value={syncListId} onValueChange={setSyncListId}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Ziel-Liste auswählen" /></SelectTrigger>
                <SelectContent>
                  {lists.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* External Form Builder */}
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-black">Neues externes Formular</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Formularname (z.B. Instagram Bio Link)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-white"
            />
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Ziel-Liste" /></SelectTrigger>
              <SelectContent>
                {lists.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-black">Felder auswählen:</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked disabled />
                  <span className="text-sm text-black">E-Mail (Pflicht)</span>
                </div>
                {(["first_name", "last_name", "postal_code"] as const).map(field => (
                  <div key={field} className="flex items-center gap-2">
                    <Checkbox
                      checked={formFields[field]}
                      onCheckedChange={(v) => setFormFields(prev => ({ ...prev, [field]: !!v }))}
                    />
                    <span className="text-sm text-black">
                      {field === "first_name" ? "Vorname" : field === "last_name" ? "Nachname" : "Postleitzahl"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-[#F47B20] hover:bg-[#e06a10] text-white"
              onClick={handleCreateForm}
              disabled={createForm.isPending}
            >
              {createForm.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Formular erstellen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview & Links */}
      <div className="space-y-4">
        {createdForm ? (
          <>
            {/* Preview */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-black">Vorschau</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-[#F5F5F5] space-y-3">
                  <p className="font-medium text-black text-center">{createdForm.heading_text || "Newsletter abonnieren"}</p>
                  <Input placeholder="E-Mail *" disabled className="bg-white" />
                  {formFields.first_name && <Input placeholder="Vorname" disabled className="bg-white" />}
                  {formFields.last_name && <Input placeholder="Nachname" disabled className="bg-white" />}
                  {formFields.postal_code && <Input placeholder="PLZ" disabled className="bg-white" />}
                  <Button className="w-full bg-[#F47B20] text-white" disabled>
                    {createdForm.button_text || "Anmelden"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Share Link */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-black">Share-Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={`${baseUrl}/newsletter/${createdForm.slug}`} readOnly className="bg-gray-50 text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${baseUrl}/newsletter/${createdForm.slug}`);
                      toast.success("Link kopiert!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`${baseUrl}/newsletter/${createdForm.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Embed Code */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-black">Auf eigener Website einbetten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto text-black">
{`<iframe src="${baseUrl}/newsletter/${createdForm.slug}" width="100%" height="400" frameborder="0"></iframe>`}
                </pre>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(`<iframe src="${baseUrl}/newsletter/${createdForm.slug}" width="100%" height="400" frameborder="0"></iframe>`);
                    toast.success("Embed-Code kopiert!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Code kopieren
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-white rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              <ExternalLink className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Erstelle links ein Formular, um hier die Vorschau und den Share-Link zu sehen.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
