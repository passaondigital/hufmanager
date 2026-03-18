import type { HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

interface MediaDocumentsProps {
  hoofPhotos: HoofPhoto[];
  documents: HorseDocument[];
}

export function MediaDocuments({ hoofPhotos, documents }: MediaDocumentsProps) {
  const categoryCount = (cat: string) =>
    documents.filter((d) => d.category === cat).length;

  return (
    <div className="px-4">
      <div className="hp-section-header">
        <span className="hp-section-title">Fotos & Dokumente</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Photos */}
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--hp-bg3)", border: "0.5px solid var(--hp-border)" }}
        >
          <p className="text-[13px] font-medium text-[var(--hp-text)] mb-2">📷 Fotos</p>
          <div className="grid grid-cols-4 gap-1">
            {hoofPhotos.slice(0, 4).map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-md overflow-hidden"
                style={{ background: "var(--hp-bg4)" }}
              >
                <img
                  src={photo.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - hoofPhotos.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-md"
                style={{ background: "var(--hp-bg4)" }}
              />
            ))}
          </div>
          <p className="text-[11px] text-[var(--hp-text3)] mt-2">
            {hoofPhotos.length} Fotos · <span style={{ color: "var(--hp-amber)" }}>Alle →</span>
          </p>
        </div>

        {/* Documents */}
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--hp-bg3)", border: "0.5px solid var(--hp-border)" }}
        >
          <p className="text-[13px] font-medium text-[var(--hp-text)] mb-2">📄 Dokumente</p>
          <p className="text-[22px] font-semibold text-[var(--hp-text)]">{documents.length}</p>
          <p className="text-[11px] text-[var(--hp-text3)] mt-0.5">
            {categoryCount("contract")} Vertrag · {categoryCount("invoice")} Rechnung
          </p>
          <div className="flex flex-col gap-1 mt-2">
            {documents.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                className="text-[11px] truncate py-1 px-2 rounded-md"
                style={{ background: "var(--hp-bg4)", color: "var(--hp-text2)" }}
              >
                {doc.file_name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
