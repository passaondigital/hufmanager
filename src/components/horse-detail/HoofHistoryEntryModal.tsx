import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Upload, Mic, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HoofHistoryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
}

const ENTRY_TYPES = [
  { value: "standard", label: "Standard-Bearbeitung" },
  { value: "beschlag", label: "Beschlag" },
  { value: "krankheitsfall", label: "Krankheitsfall" },
  { value: "kontrolle", label: "Kontrolle" },
] as const;

export function HoofHistoryEntryModal({
  isOpen,
  onClose,
  horseId,
  horseName,
}: HoofHistoryEntryModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryType, setEntryType] = useState<string>("standard");
  const [description, setDescription] = useState("");
  const [photoBeforeUrl, setPhotoBeforeUrl] = useState<string | null>(null);
  const [photoAfterUrl, setPhotoAfterUrl] = useState<string | null>(null);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setEntryType("standard");
    setDescription("");
    setPhotoBeforeUrl(null);
    setPhotoAfterUrl(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const uploadPhoto = async (
    file: File,
    type: "before" | "after"
  ): Promise<string | null> => {
    const setUploading = type === "before" ? setUploadingBefore : setUploadingAfter;
    const setUrl = type === "before" ? setPhotoBeforeUrl : setPhotoAfterUrl;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${horseId}/${Date.now()}-${type}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("hoof_images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("hoof_images")
        .getPublicUrl(fileName);

      setUrl(urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen des Fotos");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilddateien hochladen");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 10MB)");
      return;
    }

    await uploadPhoto(file, type);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nicht angemeldet");

      const { error } = await supabase.from("hoof_history").insert({
        horse_id: horseId,
        created_by: user.id,
        entry_date: entryDate,
        entry_type: entryType,
        description: description || null,
        photo_before_url: photoBeforeUrl,
        photo_after_url: photoAfterUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hoof-history", horseId] });
      toast.success("Eintrag erstellt");
      handleClose();
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Fehler beim Erstellen des Eintrags");
    },
  });

  const isSubmitting = createMutation.isPending || uploadingBefore || uploadingAfter;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Huf-Eintrag für {horseName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="entry-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datum
            </Label>
            <Input
              id="entry-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger>
                <SelectValue placeholder="Typ wählen" />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Befund / Notizen</Label>
            <Textarea
              id="description"
              placeholder="z.B. Strahlfäule behandelt, Wandüberstand gekürzt..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <Label>Fotos</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Before Photo */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Vorher</p>
                <input
                  ref={beforeInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "before")}
                />
                {photoBeforeUrl ? (
                  <div className="relative">
                    <img
                      src={photoBeforeUrl}
                      alt="Vorher"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setPhotoBeforeUrl(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 flex flex-col gap-1"
                    onClick={() => beforeInputRef.current?.click()}
                    disabled={uploadingBefore}
                  >
                    {uploadingBefore ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="text-xs">Hochladen</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* After Photo */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Nachher</p>
                <input
                  ref={afterInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "after")}
                />
                {photoAfterUrl ? (
                  <div className="relative">
                    <img
                      src={photoAfterUrl}
                      alt="Nachher"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setPhotoAfterUrl(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 flex flex-col gap-1"
                    onClick={() => afterInputRef.current?.click()}
                    disabled={uploadingAfter}
                  >
                    {uploadingAfter ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="text-xs">Hochladen</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Voice Note Placeholder */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Sprachnotiz
            </Label>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground"
              disabled
            >
              <Mic className="h-4 w-4" />
              <span>Sprachaufnahme (demnächst verfügbar)</span>
            </Button>
            <p className="text-xs text-muted-foreground">
              Diese Funktion wird in einem zukünftigen Update freigeschaltet.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={isSubmitting}
            className="bg-[#F47B20] hover:bg-[#F47B20]/90 text-white"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              "Eintrag speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
