import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Blocks, Code } from "lucide-react";
import { useEmailCampaigns } from "../hooks/useEmailCampaigns";
import { useEmailLists } from "../hooks/useEmailLists";
import { TemplateSelector, type EmailTemplate } from "./EmailTemplates";
import { BlockEditor } from "./block-editor/BlockEditor";
import { blocksToHtml, BLOCK_DEFAULTS } from "./block-editor/types";
import type { EmailBlock } from "./block-editor/types";
import { toast } from "sonner";

interface CampaignEditorProps {
  campaign?: any;
  onClose: () => void;
}

const DEFAULT_BLOCKS: EmailBlock[] = [
  { id: "1", type: "heading", content: "Willkommen!", level: "h1", align: "left" },
  { id: "2", type: "text", content: "Schön, dass du dabei bist. Hier kannst du deinen Newsletter-Inhalt gestalten.", align: "left" },
  { id: "3", type: "button", content: "Jetzt entdecken", buttonUrl: "#", buttonColor: "#F47B20", align: "center" },
];

export function CampaignEditor({ campaign, onClose }: CampaignEditorProps) {
  const { createCampaign, updateCampaign } = useEmailCampaigns();
  const { lists } = useEmailLists();
  const [name, setName] = useState(campaign?.name || "");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [senderName, setSenderName] = useState(campaign?.sender_name || "");
  const [listId, setListId] = useState(campaign?.list_id || "");
  const [contentHtml, setContentHtml] = useState(campaign?.content_html || "");
  const [blocks, setBlocks] = useState<EmailBlock[]>(campaign ? [] : DEFAULT_BLOCKS);
  const [editorMode, setEditorMode] = useState<"blocks" | "html">(campaign?.content_html ? "html" : "blocks");
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!campaign && !contentHtml);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSubject(template.subject);
    setContentHtml(template.content_html);
    if (!name) setName(template.name + " Kampagne");
    setEditorMode("html");
    setShowTemplates(false);
  };

  const handleBlocksChange = (newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    setContentHtml(blocksToHtml(newBlocks));
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) return toast.error("Name und Betreff sind Pflichtfelder");
    const finalHtml = editorMode === "blocks" ? blocksToHtml(blocks) : contentHtml;
    setSaving(true);
    try {
      if (campaign?.id) {
        await updateCampaign.mutateAsync({ id: campaign.id, name, subject, sender_name: senderName, list_id: listId || null, content_html: finalHtml });
      } else {
        await createCampaign.mutateAsync({ name, subject, sender_name: senderName, list_id: listId || undefined, content_html: finalHtml });
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
      {/* Template Selector for new campaigns */}
      {showTemplates && (
        <>
          <TemplateSelector onSelect={handleTemplateSelect} />
          <div className="text-center">
            <Button
              variant="link"
              className="text-xs text-muted-foreground"
              onClick={() => { setShowTemplates(false); setEditorMode("blocks"); }}
            >
              Oder starte mit dem Block-Editor →
            </Button>
          </div>
        </>
      )}

      {!showTemplates && (
        <>
          {!campaign && (
            <Button variant="link" className="text-xs text-muted-foreground p-0 h-auto" onClick={() => setShowTemplates(true)}>
              ← Vorlage wechseln
            </Button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-black">Kampagnen-Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Sommer-Newsletter" className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-black">Betreffzeile</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="z.B. Neuigkeiten aus dem Stall" className="bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-black">Absendername</Label>
              <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="z.B. Max Mustermann" className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-black">Ziel-Liste</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Liste auswählen" /></SelectTrigger>
                <SelectContent>
                  {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Editor Mode Tabs */}
          <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as "blocks" | "html")}>
            <TabsList className="bg-gray-100 h-9">
              <TabsTrigger value="blocks" className="text-xs gap-1.5 data-[state=active]:bg-white">
                <Blocks className="w-3.5 h-3.5" />
                Block-Editor
              </TabsTrigger>
              <TabsTrigger value="html" className="text-xs gap-1.5 data-[state=active]:bg-white">
                <Code className="w-3.5 h-3.5" />
                HTML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blocks" className="mt-3">
              <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
            </TabsContent>

            <TabsContent value="html" className="mt-3 space-y-3">
              <Textarea
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="<h1>Hallo!</h1><p>Dein Newsletter...</p>"
                className="bg-white min-h-[200px] font-mono text-xs"
              />
              {contentHtml && (
                <div className="space-y-2">
                  <Label className="text-black text-sm">Vorschau</Label>
                  <div className="border rounded-lg p-4 bg-white max-h-[200px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: contentHtml }} />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button className="bg-[#F47B20] hover:bg-[#e06a10] text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {campaign ? "Speichern" : "Erstellen"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
