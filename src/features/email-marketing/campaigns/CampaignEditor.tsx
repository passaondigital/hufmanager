import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEmailCampaigns } from "../hooks/useEmailCampaigns";
import { useEmailLists } from "../hooks/useEmailLists";
import { toast } from "sonner";

interface CampaignEditorProps {
  campaign?: any;
  onClose: () => void;
}

export function CampaignEditor({ campaign, onClose }: CampaignEditorProps) {
  const { createCampaign, updateCampaign } = useEmailCampaigns();
  const { lists } = useEmailLists();
  const [name, setName] = useState(campaign?.name || "");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [senderName, setSenderName] = useState(campaign?.sender_name || "");
  const [listId, setListId] = useState(campaign?.list_id || "");
  const [contentHtml, setContentHtml] = useState(campaign?.content_html || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) return toast.error("Name und Betreff sind Pflichtfelder");
    setSaving(true);
    try {
      if (campaign?.id) {
        await updateCampaign.mutateAsync({ id: campaign.id, name, subject, sender_name: senderName, list_id: listId || null, content_html: contentHtml });
      } else {
        await createCampaign.mutateAsync({ name, subject, sender_name: senderName, list_id: listId || undefined, content_html: contentHtml });
      }
      toast.success(campaign ? "Kampagne aktualisiert" : "Kampagne erstellt");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-black">Kampagnen-Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Sommer-Newsletter" className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-black">Betreffzeile</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Neuigkeiten aus dem Stall" className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-black">Absendername</Label>
        <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="z.B. Max Mustermann" className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-black">Ziel-Liste</Label>
        <Select value={listId} onValueChange={setListId}>
          <SelectTrigger className="bg-white"><SelectValue placeholder="Liste auswählen (optional)" /></SelectTrigger>
          <SelectContent>
            {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-black">E-Mail Inhalt (HTML)</Label>
        <Textarea
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
          placeholder="<h1>Hallo!</h1><p>Dein Newsletter...</p>"
          className="bg-white min-h-[200px] font-mono text-sm"
        />
      </div>
      {contentHtml && (
        <div className="space-y-2">
          <Label className="text-black">Vorschau</Label>
          <div className="border rounded-lg p-4 bg-white max-h-[200px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </div>
      )}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button className="bg-[#F47B20] hover:bg-[#e06a10] text-white" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {campaign ? "Speichern" : "Erstellen"}
        </Button>
      </div>
    </div>
  );
}
