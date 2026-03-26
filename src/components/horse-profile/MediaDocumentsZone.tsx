import { useRef, useState, useEffect } from "react";
import { Camera, FileText, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface MediaDocumentsZoneProps {
  horseId: string;
  hoofPhotos: HoofPhoto[];
  documents: HorseDocument[];
  role: Role;
  onShowAllPhotos?: () => void;
  onShowAllDocs?: () => void;
  onUploadPhoto?: () => void;
  onUploadDoc?: () => void;
  onPhotosChanged?: () => void;
  onDocsChanged?: () => void;
}

export function MediaDocumentsZone({
  horseId, hoofPhotos, documents, role,
  onShowAllPhotos, onShowAllDocs, onUploadPhoto, onUploadDoc,
  onPhotosChanged, onDocsChanged,
}: MediaDocumentsZoneProps) {
  const { user } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const canUploadPhotos = role === "provider" || role === "employee" || role === "client";
  const canUploadDocs = role === "provider" || role === "employee" || role === "client";

  const categoryCount = (cat: string) => documents.filter(d => d.category === cat).length;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const filePath = `${horseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("hoof_photos")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("hoof_photos").insert({
        horse_id: horseId,
        photo_url: filePath,
        taken_at: new Date().toISOString(),
      } as any);
      if (insertError) throw insertError;

      toast.success("Foto hochgeladen");
      onPhotosChanged?.();
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error("Upload fehlgeschlagen");
    }
    e.target.value = "";
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const filePath = `${horseId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("horse-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("horse_documents").insert({
        horse_id: horseId,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
        uploaded_by: user.id,
      } as any);
      if (insertError) throw insertError;

      toast.success("Dokument hochgeladen");
      onDocsChanged?.();
    } catch (err: any) {
      console.error("Doc upload error:", err);
      toast.error("Upload fehlgeschlagen");
    }
    e.target.value = "";
  };

  const triggerPhotoUpload = () => {
    if (onUploadPhoto) { onUploadPhoto(); return; }
    photoInputRef.current?.click();
  };

  const triggerDocUpload = () => {
    if (onUploadDoc) { onUploadDoc(); return; }
    docInputRef.current?.click();
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Fotos & Dokumente</h3>

      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={handleDocUpload} />

      <div className="grid grid-cols-2 gap-2.5">
        {/* Photos */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Fotos</span>
            </div>
            {canUploadPhotos && (
              <button onClick={triggerPhotoUpload} className="p-1 rounded hover:bg-accent">
                <Upload className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1">
            {hoofPhotos.slice(0, 4).map(photo => (
              <div key={photo.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={photo.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - hoofPhotos.length) }).map((_, i) => (
              <div key={`e-${i}`} className="aspect-square rounded-md bg-muted" />
            ))}
          </div>

          <button onClick={onShowAllPhotos} className="text-[11px] text-muted-foreground mt-2 hover:text-primary">
            {hoofPhotos.length} Fotos · <span className="text-primary">Alle →</span>
          </button>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Dokumente</span>
            </div>
            {canUploadDocs && (
              <button onClick={triggerDocUpload} className="p-1 rounded hover:bg-accent">
                <Upload className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <p className="text-2xl font-semibold text-foreground">{documents.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {categoryCount("contract")} Vertrag · {categoryCount("invoice")} Rechnung
          </p>

          <div className="flex flex-col gap-1 mt-2">
            {documents.slice(0, 3).map(doc => (
              <div key={doc.id} className="text-[11px] truncate py-1 px-2 rounded-md bg-muted text-muted-foreground">
                {doc.file_name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
