import { useState, useRef, useCallback, useEffect } from "react";
import { CanvasBlock as CanvasBlockType, MIN_BLOCK_SIZE } from "./types";
import { CanvasBlockContent } from "./CanvasBlockContent";
import { cn } from "@/lib/utils";

interface CanvasBlockProps {
  block: CanvasBlockType;
  onChange: (block: CanvasBlockType) => void;
  isSelected: boolean;
  onSelect: () => void;
  scale: number;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";

export function CanvasBlockComponent({ block, onChange, isSelected, onSelect, scale }: CanvasBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef<{ x: number; y: number; blockX: number; blockY: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number; bx: number; by: number; handle: ResizeHandle } | null>(null);

  // Drag handlers
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, blockX: block.x, blockY: block.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [block.x, block.y, onSelect]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (isDragging && dragStart.current) {
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      onChange({
        ...block,
        x: Math.max(0, dragStart.current.blockX + dx),
        y: Math.max(0, dragStart.current.blockY + dy),
      });
    }
    if (isResizing && resizeStart.current) {
      const rs = resizeStart.current;
      const dx = (e.clientX - rs.x) / scale;
      const dy = (e.clientY - rs.y) / scale;

      let newX = block.x, newY = block.y, newW = rs.w, newH = rs.h;

      if (rs.handle.includes("e")) newW = Math.max(MIN_BLOCK_SIZE, rs.w + dx);
      if (rs.handle.includes("w")) { newW = Math.max(MIN_BLOCK_SIZE, rs.w - dx); newX = rs.bx + dx; if (newW === MIN_BLOCK_SIZE) newX = rs.bx + rs.w - MIN_BLOCK_SIZE; }
      if (rs.handle.includes("s")) newH = Math.max(MIN_BLOCK_SIZE, rs.h + dy);
      if (rs.handle.includes("n")) { newH = Math.max(MIN_BLOCK_SIZE, rs.h - dy); newY = rs.by + dy; if (newH === MIN_BLOCK_SIZE) newY = rs.by + rs.h - MIN_BLOCK_SIZE; }

      onChange({ ...block, x: Math.max(0, newX), y: Math.max(0, newY), width: newW, height: newH });
    }
  }, [isDragging, isResizing, block, onChange, scale]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragStart.current = null;
    resizeStart.current = null;
  }, []);

  const handleResizeStart = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: block.width, h: block.height, bx: block.x, by: block.y, handle };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [block, onSelect]);

  const handleCorners: { handle: ResizeHandle; className: string }[] = [
    { handle: "nw", className: "-top-1 -left-1 cursor-nw-resize" },
    { handle: "ne", className: "-top-1 -right-1 cursor-ne-resize" },
    { handle: "sw", className: "-bottom-1 -left-1 cursor-sw-resize" },
    { handle: "se", className: "-bottom-1 -right-1 cursor-se-resize" },
  ];

  return (
    <div
      ref={blockRef}
      className={cn(
        "absolute border rounded transition-shadow select-none",
        isSelected
          ? "border-primary shadow-md ring-1 ring-primary/30 z-20"
          : "border-border/50 hover:border-border z-10",
        isDragging && "opacity-80 cursor-grabbing",
      )}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
      }}
      onPointerDown={handleDragStart}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Block content */}
      <div className="w-full h-full overflow-hidden bg-card/80 rounded">
        <CanvasBlockContent block={block} onChange={onChange} scale={scale} />
      </div>

      {/* Resize handles */}
      {isSelected && handleCorners.map(({ handle, className }) => (
        <div
          key={handle}
          data-handle="true"
          className={cn(
            "absolute w-3 h-3 rounded-sm bg-primary border border-primary-foreground shadow-sm",
            className
          )}
          onPointerDown={(e) => handleResizeStart(e, handle)}
        />
      ))}

      {/* Type label */}
      {isSelected && (
        <div className="absolute -top-5 left-0 text-[9px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-medium whitespace-nowrap">
          {block.label || block.type}
        </div>
      )}
    </div>
  );
}
