import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Mail, Clock, Trash2, GripVertical } from "lucide-react";
import { useEmailLists } from "../hooks/useEmailLists";
import type { AutomationStep, AutomationEmailStep, AutomationDelayStep, TriggerType, DelayUnit } from "./types";
import { TRIGGER_LABELS, DELAY_UNIT_LABELS } from "./types";
import { TemplatePickerCard } from "./TemplatePickerCard";
import type { AutomationTemplate } from "./automationTemplates";

export function AutoresponderBuilder() {
  const { lists } = useEmailLists();
  const [showTemplates, setShowTemplates] = useState(true);
  const [name, setName] = useState("Willkommens-Serie");
  const [triggerType, setTriggerType] = useState<TriggerType>("list_add");
  const [listId, setListId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState<AutomationStep[]>([
    { id: "1", type: "email", subject: "Willkommen!", content_html: "<p>Schön, dass du dabei bist!</p>" },
    { id: "2", type: "delay", delay_value: 3, delay_unit: "days" },
    { id: "3", type: "email", subject: "Dein erster Tipp", content_html: "<p>Hier ist dein erster Tipp...</p>" },
  ]);
  const [editingStep, setEditingStep] = useState<AutomationEmailStep | null>(null);
  const [editingDelayId, setEditingDelayId] = useState<string | null>(null);

  const loadTemplate = (template: AutomationTemplate) => {
    setName(template.name);
    setTriggerType(template.trigger_type);
    setSteps(template.steps);
    setIsActive(false);
    setShowTemplates(false);
  };

  const addStep = () => {
    const delayId = Date.now().toString() + "-d";
    const emailId = Date.now().toString() + "-e";
    setSteps(prev => [
      ...prev,
      { id: delayId, type: "delay", delay_value: 1, delay_unit: "days" } as AutomationDelayStep,
      { id: emailId, type: "email", subject: "", content_html: "" } as AutomationEmailStep,
    ]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      // Remove the email and its preceding delay
      if (prev[idx].type === "email" && idx > 0 && prev[idx - 1].type === "delay") {
        return prev.filter((_, i) => i !== idx && i !== idx - 1);
      }
      return prev.filter(s => s.id !== id);
    });
  };

  const updateDelay = (id: string, value: number, unit: DelayUnit) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, delay_value: value, delay_unit: unit } as AutomationDelayStep : s));
  };

  const updateEmail = (id: string, subject: string, content_html: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, subject, content_html } as AutomationEmailStep : s));
    setEditingStep(null);
  };

  return (
    <div className="space-y-4">
      {/* Template Picker */}
      {showTemplates && (
        <TemplatePickerCard onSelect={loadTemplate} />
      )}
      {!showTemplates && (
        <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="text-xs">
          📋 Vorlage wählen
        </Button>
      )}
      {/* Trigger Card */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-semibold border-none px-0 text-black focus-visible:ring-0"
              placeholder="Sequenz-Name..."
            />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground">{isActive ? "Aktiv" : "Pausiert"}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-black">Diese Automatisierung startet, wenn...</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {triggerType === "list_add" && (
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Liste auswählen" /></SelectTrigger>
              <SelectContent>
                {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative pl-8 sm:pl-10">
        {/* Vertical Line */}
        <div className="absolute left-[15px] sm:left-[19px] top-0 bottom-0 w-0.5 bg-gray-300" />

        {steps.map((step, idx) => (
          <div key={step.id} className="relative mb-4">
            {/* Timeline dot */}
            <div className={`absolute -left-[17px] sm:-left-[21px] top-3 w-4 h-4 rounded-full border-2 border-white shadow ${
              step.type === "email" ? "bg-[#F47B20]" : "bg-gray-400"
            }`} />

            {step.type === "delay" ? (
              /* Delay Block */
              <div
                className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => setEditingDelayId(step.id)}
              >
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Warte {(step as AutomationDelayStep).delay_value} {DELAY_UNIT_LABELS[(step as AutomationDelayStep).delay_unit]}
                </span>
              </div>
            ) : (
              /* Email Step Card */
              <Card className="bg-white rounded-xl shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-[#F47B20] shrink-0" />
                        <span className="font-medium text-black truncate text-sm">
                          {(step as AutomationEmailStep).subject || "Kein Betreff"}
                        </span>
                      </div>
                      {(step as AutomationEmailStep).content_html && (
                        <p className="text-xs text-muted-foreground truncate ml-6">
                          {(step as AutomationEmailStep).content_html.replace(/<[^>]*>/g, "").slice(0, 60)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-6 sm:ml-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingStep(step as AutomationEmailStep)}
                        className="text-xs h-7"
                      >
                        Bearbeiten
                      </Button>
                      {idx > 0 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(step.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}

        {/* Add Button */}
        <div className="relative">
          <div className="absolute -left-[17px] sm:-left-[21px] top-2 w-4 h-4 rounded-full bg-[#F47B20] border-2 border-white shadow flex items-center justify-center">
            <Plus className="w-2.5 h-2.5 text-white" />
          </div>
          <Button
            onClick={addStep}
            className="bg-[#F47B20] hover:bg-[#e06a10] text-white rounded-full"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Hinzufügen
          </Button>
        </div>
      </div>

      {/* Email Editor Modal */}
      {editingStep && (
        <EmailEditorDialog
          step={editingStep}
          onSave={(subject, content) => updateEmail(editingStep.id, subject, content)}
          onClose={() => setEditingStep(null)}
        />
      )}

      {/* Delay Editor Modal */}
      {editingDelayId && (
        <DelayEditorDialog
          step={steps.find(s => s.id === editingDelayId) as AutomationDelayStep}
          onSave={(value, unit) => { updateDelay(editingDelayId, value, unit); setEditingDelayId(null); }}
          onClose={() => setEditingDelayId(null)}
        />
      )}
    </div>
  );
}

function EmailEditorDialog({ step, onSave, onClose }: { step: AutomationEmailStep; onSave: (subject: string, content: string) => void; onClose: () => void }) {
  const [subject, setSubject] = useState(step.subject);
  const [content, setContent] = useState(step.content_html);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-black">E-Mail bearbeiten</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black">Betreffzeile</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-black">Inhalt (HTML)</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="bg-white min-h-[200px] font-mono text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button className="bg-[#F47B20] hover:bg-[#e06a10] text-white" onClick={() => onSave(subject, content)}>Speichern</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DelayEditorDialog({ step, onSave, onClose }: { step: AutomationDelayStep; onSave: (value: number, unit: DelayUnit) => void; onClose: () => void }) {
  const [value, setValue] = useState(step.delay_value);
  const [unit, setUnit] = useState<DelayUnit>(step.delay_unit);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-black">Verzögerung bearbeiten</DialogTitle></DialogHeader>
        <div className="flex gap-3 items-end">
          <div className="space-y-2 flex-1">
            <Label className="text-black">Wert</Label>
            <Input type="number" min={0} value={value} onChange={(e) => setValue(Number(e.target.value))} className="bg-white" />
          </div>
          <div className="space-y-2 flex-1">
            <Label className="text-black">Einheit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as DelayUnit)}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DELAY_UNIT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button className="bg-[#F47B20] hover:bg-[#e06a10] text-white" onClick={() => onSave(value, unit)}>Speichern</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
