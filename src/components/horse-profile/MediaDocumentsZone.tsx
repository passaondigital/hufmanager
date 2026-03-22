import { Camera, FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

type Role = "client" | "provider" | "employee" | "partner" | "portal";

interface MediaDocumentsZoneProps {
  hoofPhotos: HoofPhoto[];
  documents: HorseDocument[];
  role: Role;
  onShowAllPhotos?: () => void;
  onShowAllDocs?: () => void;
  onUploadPhoto?: () => void;
  onUploadDoc?: () => void;
}

export function MediaDocumentsZone({ hoofPhotos, documents, role, onShowAllPhotos, onShowAllDocs, onUploadPhoto, onUploadDoc }: MediaDocumentsZoneProps) {
  const canUploadPhotos = role === "provider" || role === "employee";
  const canUploadDocs = role === "provider" || role === "employee" || role === "client";

  const categoryCount = (cat: string) => documents.filter(d => d.category === cat).length;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Fotos & Dokumente</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {/* Photos */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Fotos</span>
            </div>
            {canUploadPhotos && onUploadPhoto && (
              <button onClick={onUploadPhoto} className="p-1 rounded hover:bg-accent">
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
            {canUploadDocs && onUploadDoc && (
              <button onClick={onUploadDoc} className="p-1 rounded hover:bg-accent">
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
