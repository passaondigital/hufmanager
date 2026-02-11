import { useState, useRef, useCallback, useEffect } from "react";
import {
  CanvasBlock, CanvasDocument, CanvasBranding,
  CANVAS_WIDTH, CANVAS_HEIGHT, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP,
  DEFAULT_BLOCK_SIZES, AUTO_SAVE_DELAY,
} from "./types";
import { CanvasBlockComponent } from "./CanvasBlock";
import { EditorToolbar } from "./EditorToolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { CanvasBrandingPanel } from "./CanvasBrandingPanel";
import type { CanvasBlockType } from "./types";

interface CanvasEditorProps {
  document: CanvasDocument;
  onChange: (doc: CanvasDocument) => void;
  onSave: () => void;
  onExportPdf: () => void;
  onBack: () => void;
  saving?: boolean;
}

const LS_KEY_PREFIX = "hm_office_autosave_";

type PanelTab = "properties" | "branding";

export function CanvasEditor({ document: doc, onChange, onSave, onExportPdf, onBack, saving }: CanvasEditorProps) {
  const [zoom, setZoom] = useState(0.85);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("properties");
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const selectedBlock = doc.blocks.find((b) => b.id === selectedBlockId) || null;

  // Auto-save to localStorage
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const key = LS_KEY_PREFIX + (doc.id || "new");
      try {
        localStorage.setItem(key, JSON.stringify(doc));
      } catch { /* quota exceeded */ }
    }, AUTO_SAVE_DELAY);
    setHasUnsaved(true);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [doc]);

  // Load from localStorage on mount
  useEffect(() => {
    const key = LS_KEY_PREFIX + (doc.id || "new");
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as CanvasDocument;
        if (parsed.blocks && parsed.blocks.length > 0) {
          if (JSON.stringify(parsed.blocks) !== JSON.stringify(doc.blocks)) {
            onChange(parsed);
          }
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);

  const handleAddBlock = useCallback((type: CanvasBlockType) => {
    const size = DEFAULT_BLOCK_SIZES[type];
    const newBlock: CanvasBlock = {
      id: crypto.randomUUID(),
      type,
      x: (CANVAS_WIDTH - size.width) / 2,
      y: Math.min(
        CANVAS_HEIGHT - size.height - 20,
        Math.max(20, doc.blocks.length * 30 + 20)
      ),
      width: size.width,
      height: size.height,
      ...(type === "checkbox" && {
        checkboxItems: [
          { id: crypto.randomUUID(), label: "Option 1", checked: false },
          { id: crypto.randomUUID(), label: "Option 2", checked: false },
        ],
      }),
      ...(type === "dropdown" && {
        options: [
          { label: "Option 1", value: "option_1" },
          { label: "Option 2", value: "option_2" },
        ],
      }),
      ...(type === "scale" && { scaleMin: 1, scaleMax: 5, scaleValue: 0 }),
      ...(type === "graphic" && { graphicType: "horse-side" as const }),
      ...(type === "auto-info" && { autoInfoType: "datum" as const }),
      ...(type === "date" && { showTimestamp: false }),
    };
    onChange({ ...doc, blocks: [...doc.blocks, newBlock] });
    setSelectedBlockId(newBlock.id);
    setPanelTab("properties");
  }, [doc, onChange]);

  const handleBlockChange = useCallback((updated: CanvasBlock) => {
    onChange({
      ...doc,
      blocks: doc.blocks.map((b) => (b.id === updated.id ? updated : b)),
    });
  }, [doc, onChange]);

  const handleDeleteBlock = useCallback(() => {
    if (!selectedBlockId) return;
    const block = doc.blocks.find((b) => b.id === selectedBlockId);
    if (block?.locked) return; // Can't delete locked blocks
    onChange({ ...doc, blocks: doc.blocks.filter((b) => b.id !== selectedBlockId) });
    setSelectedBlockId(null);
  }, [doc, onChange, selectedBlockId]);

  const handleDuplicateBlock = useCallback(() => {
    if (!selectedBlock) return;
    const clone: CanvasBlock = {
      ...JSON.parse(JSON.stringify(selectedBlock)),
      id: crypto.randomUUID(),
      x: selectedBlock.x + 20,
      y: selectedBlock.y + 20,
      locked: false, // Duplicates are always unlocked
    };
    onChange({ ...doc, blocks: [...doc.blocks, clone] });
    setSelectedBlockId(clone.id);
  }, [doc, onChange, selectedBlock]);

  const handleToggleLock = useCallback(() => {
    if (!selectedBlock) return;
    handleBlockChange({ ...selectedBlock, locked: !selectedBlock.locked });
  }, [selectedBlock, handleBlockChange]);

  const handleSave = useCallback(() => {
    onSave();
    setHasUnsaved(false);
    const key = LS_KEY_PREFIX + (doc.id || "new");
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [onSave, doc.id]);

  const handleCanvasClick = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBlockId && !(document.activeElement instanceof HTMLInputElement) && !(document.activeElement instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          handleDeleteBlock();
        }
      }
      if (e.key === "Escape") setSelectedBlockId(null);
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+L to toggle lock
      if ((e.metaKey || e.ctrlKey) && e.key === "l") {
        e.preventDefault();
        handleToggleLock();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedBlockId, handleDeleteBlock, handleSave, handleToggleLock]);

  // Mouse wheel zoom
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => {
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta));
        });
      }
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  const handleBrandingChange = useCallback((branding: CanvasBranding) => {
    onChange({ ...doc, branding });
  }, [doc, onChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <EditorToolbar
        onAddBlock={handleAddBlock}
        onSave={handleSave}
        onExportPdf={onExportPdf}
        onBack={onBack}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        saving={saving}
        title={doc.title}
        onTitleChange={(t) => onChange({ ...doc, title: t })}
        status={doc.status}
        onToggleStatus={() => onChange({ ...doc, status: doc.status === "completed" ? "draft" : "completed" })}
        hasUnsaved={hasUnsaved}
        onToggleBranding={() => setPanelTab(panelTab === "branding" ? "properties" : "branding")}
        brandingActive={panelTab === "branding"}
      />

      {/* Main area: Canvas + Properties */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div
          ref={canvasContainerRef}
          className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-8"
          onClick={handleCanvasClick}
        >
          <div
            data-canvas-export="true"
            className="relative bg-white shadow-xl rounded-sm border border-border/30"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              marginBottom: CANVAS_HEIGHT * (zoom - 1),
              fontFamily: doc.branding?.fontFamily || undefined,
            }}
          >
            {/* Grid lines (subtle) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Branding header (logo + company) */}
            {(doc.branding?.logoUrl || doc.branding?.companyName) && (
              <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-4 pt-3 pointer-events-none z-[5]" style={{ color: doc.branding?.headingColor || undefined }}>
                {doc.branding?.logoUrl && (
                  <img src={doc.branding.logoUrl} alt="" className="h-8 object-contain" />
                )}
                {doc.branding?.companyName && (
                  <span className="text-xs font-semibold" style={{ color: doc.branding?.headingColor || doc.branding?.primaryColor || undefined }}>
                    {doc.branding.companyName}
                  </span>
                )}
              </div>
            )}

            {/* Blocks */}
            {doc.blocks.map((block) => (
              <CanvasBlockComponent
                key={block.id}
                block={block}
                onChange={handleBlockChange}
                isSelected={selectedBlockId === block.id}
                onSelect={() => { setSelectedBlockId(block.id); setPanelTab("properties"); }}
                scale={zoom}
              />
            ))}

            {/* Empty state */}
            {doc.blocks.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <svg className="h-7 w-7 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Leere Seite</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
                  Klicke „Baustein" in der Toolbar, um Felder hinzuzufügen
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Properties / Branding Panel */}
        <div className="w-64 border-l bg-card shrink-0 hidden lg:flex flex-col">
          {/* Panel tabs */}
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setPanelTab("properties")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${panelTab === "properties" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Eigenschaften
            </button>
            <button
              onClick={() => setPanelTab("branding")}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${panelTab === "branding" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Branding
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {panelTab === "properties" ? (
              <PropertiesPanel
                block={selectedBlock}
                onChange={handleBlockChange}
                onDelete={handleDeleteBlock}
                onDuplicate={handleDuplicateBlock}
              />
            ) : (
              <CanvasBrandingPanel
                branding={doc.branding || {}}
                onChange={handleBrandingChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
