import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/storage";
import { Camera, Plus, X, Loader2, Send, Image as ImageIcon } from "lucide-react";

interface EmployeeDocumentationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  providerId: string;
  employeeId: string;
  appointmentInfo?: {
    horseName?: string;
    clientName?: string;
  };
}

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

export function EmployeeDocumentationForm({
  open,
  onOpenChange,
  assignmentId,
  providerId,
  employeeId,
  appointmentInfo,
}: EmployeeDocumentationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [materialItems, setMaterialItems] = useState<{ name: string; quantity: string }[]>([]);

  const addMaterialItem = () => {
    setMaterialItems((prev) => [...prev, { name: "", quantity: "1" }]);
  };

  const updateMaterial = (index: number, field: "name" | "quantity", value: string) => {
    setMaterialItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeMaterial = (index: number) => {
    setMaterialItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Nicht authentifiziert");

      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const filePath = `employee-docs/${providerId}/${assignmentId}/${photo.id}`;
        const result = await uploadFile("horse-media", filePath, photo.file);
        if (result.path) photoUrls.push(result.path);
      }

      // Build materials as JSON (quantity only, no prices)
      const materialsUsed = materialItems
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name, quantity: parseFloat(m.quantity) || 1 }));

      const { error } = await supabase.from("employee_documentation").insert({
        assignment_id: assignmentId,
        employee_id: employeeId,
        provider_id: providerId,
        notes: notes || null,
        photos: photoUrls.length > 0 ? photoUrls : null,
        materials_used: materialsUsed.length > 0 ? materialsUsed : null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["pending-documentation"] });
      toast({ title: "Dokumentation eingereicht", description: "Warte auf Freigabe vom Chef." });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNotes("");
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setMaterialItems([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dokumentation</SheetTitle>
          <SheetDescription>
            {appointmentInfo?.horseName} • {appointmentInfo?.clientName}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Photos */}
          <div>
            <Label className="mb-2 block">Fotos</Label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <Camera className="h-5 w-5 mb-1" />
                  <span className="text-xs">Kamera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <ImageIcon className="h-5 w-5 mb-1" />
                  <span className="text-xs">Galerie</span>
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="doc-notes">Notizen</Label>
            <Textarea
              id="doc-notes"
              placeholder="Beobachtungen, durchgeführte Arbeiten..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5"
              rows={4}
            />
          </div>

          {/* Materials (quantity only, no prices) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Materialverbrauch</Label>
              <Button variant="ghost" size="sm" onClick={addMaterialItem}>
                <Plus className="h-4 w-4 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {materialItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kein Material erfasst</p>
            ) : (
              <div className="space-y-2">
                {materialItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Material"
                      value={item.name}
                      onChange={(e) => updateMaterial(index, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Menge"
                      value={item.quantity}
                      onChange={(e) => updateMaterial(index, "quantity", e.target.value)}
                      className="w-20"
                      min="1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeMaterial(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            className="w-full"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || (!notes && photos.length === 0)}
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Einreichen
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
