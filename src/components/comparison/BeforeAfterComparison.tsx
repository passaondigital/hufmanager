import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, X, Plus, Trash2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComparisonPair {
  id: string;
  label: string;
  beforeImage: string | null;
  afterImage: string | null;
}

interface BeforeAfterComparisonProps {
  pairs: ComparisonPair[];
  onPairsChange: (pairs: ComparisonPair[]) => void;
  readOnly?: boolean;
  title?: string;
}

export function BeforeAfterComparison({
  pairs,
  onPairsChange,
  readOnly = false,
  title = "Vorher / Nachher Vergleich"
}: BeforeAfterComparisonProps) {
  const [sliderPositions, setSliderPositions] = useState<Record<string, number>>({});

  const handleImageUpload = (pairId: string, type: "before" | "after", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onPairsChange(
        pairs.map((pair) =>
          pair.id === pairId
            ? { ...pair, [type === "before" ? "beforeImage" : "afterImage"]: result }
            : pair
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (pairId: string, type: "before" | "after") => {
    onPairsChange(
      pairs.map((pair) =>
        pair.id === pairId
          ? { ...pair, [type === "before" ? "beforeImage" : "afterImage"]: null }
          : pair
      )
    );
  };

  const handleAddPair = () => {
    const newPair: ComparisonPair = {
      id: crypto.randomUUID(),
      label: `Vergleich ${pairs.length + 1}`,
      beforeImage: null,
      afterImage: null,
    };
    onPairsChange([...pairs, newPair]);
  };

  const handleRemovePair = (pairId: string) => {
    onPairsChange(pairs.filter((pair) => pair.id !== pairId));
  };

  const handleLabelChange = (pairId: string, label: string) => {
    onPairsChange(
      pairs.map((pair) =>
        pair.id === pairId ? { ...pair, label } : pair
      )
    );
  };

  const handleSliderChange = (pairId: string, value: number) => {
    setSliderPositions((prev) => ({ ...prev, [pairId]: value }));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {pairs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Keine Vergleiche vorhanden</p>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAddPair}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ersten Vergleich hinzufügen
              </Button>
            )}
          </div>
        ) : (
          <>
            {pairs.map((pair) => (
              <ComparisonPairCard
                key={pair.id}
                pair={pair}
                sliderPosition={sliderPositions[pair.id] ?? 50}
                onSliderChange={(value) => handleSliderChange(pair.id, value)}
                onImageUpload={(type, file) => handleImageUpload(pair.id, type, file)}
                onRemoveImage={(type) => handleRemoveImage(pair.id, type)}
                onLabelChange={(label) => handleLabelChange(pair.id, label)}
                onRemove={() => handleRemovePair(pair.id)}
                readOnly={readOnly}
              />
            ))}

            {!readOnly && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAddPair}
              >
                <Plus className="h-4 w-4 mr-2" />
                Weiteren Vergleich hinzufügen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ComparisonPairCardProps {
  pair: ComparisonPair;
  sliderPosition: number;
  onSliderChange: (value: number) => void;
  onImageUpload: (type: "before" | "after", file: File) => void;
  onRemoveImage: (type: "before" | "after") => void;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
  readOnly: boolean;
}

function ComparisonPairCard({
  pair,
  sliderPosition,
  onSliderChange,
  onImageUpload,
  onRemoveImage,
  onLabelChange,
  onRemove,
  readOnly,
}: ComparisonPairCardProps) {
  const hasBothImages = pair.beforeImage && pair.afterImage;

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      {/* Header with label and remove button */}
      <div className="flex items-center justify-between gap-2">
        {readOnly ? (
          <span className="font-medium text-sm">{pair.label}</span>
        ) : (
          <Input
            value={pair.label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="h-8 text-sm font-medium max-w-[200px]"
            placeholder="Bezeichnung..."
          />
        )}
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Comparison View */}
      {hasBothImages ? (
        <InteractiveSliderComparison
          beforeImage={pair.beforeImage!}
          afterImage={pair.afterImage!}
          sliderPosition={sliderPosition}
          onSliderChange={onSliderChange}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <ImageUploadSlot
            label="Vorher"
            image={pair.beforeImage}
            onUpload={(file) => onImageUpload("before", file)}
            onRemove={() => onRemoveImage("before")}
            readOnly={readOnly}
          />
          <ImageUploadSlot
            label="Nachher"
            image={pair.afterImage}
            onUpload={(file) => onImageUpload("after", file)}
            onRemove={() => onRemoveImage("after")}
            readOnly={readOnly}
            isPrimary
          />
        </div>
      )}

      {/* Show individual images below slider if both exist */}
      {hasBothImages && !readOnly && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="relative">
            <img
              src={pair.beforeImage!}
              alt="Vorher"
              className="w-full aspect-square object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => onRemoveImage("before")}
            >
              <X className="h-3 w-3" />
            </Button>
            <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-2 py-0.5 rounded">
              Vorher
            </span>
          </div>
          <div className="relative">
            <img
              src={pair.afterImage!}
              alt="Nachher"
              className="w-full aspect-square object-cover rounded-lg border-2 border-primary"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => onRemoveImage("after")}
            >
              <X className="h-3 w-3" />
            </Button>
            <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-2 py-0.5 rounded">
              Nachher
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface InteractiveSliderComparisonProps {
  beforeImage: string;
  afterImage: string;
  sliderPosition: number;
  onSliderChange: (value: number) => void;
}

function InteractiveSliderComparison({
  beforeImage,
  afterImage,
  sliderPosition,
  onSliderChange,
}: InteractiveSliderComparisonProps) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onSliderChange(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onSliderChange(percentage);
  };

  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-lg cursor-col-resize select-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* After Image (Background) */}
      <img
        src={afterImage}
        alt="Nachher"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt="Vorher"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-muted-foreground rounded-full" />
            <div className="w-0.5 h-4 bg-muted-foreground rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 text-xs font-medium bg-background/80 px-2 py-1 rounded">
        Vorher
      </span>
      <span className="absolute top-2 right-2 text-xs font-medium bg-primary text-primary-foreground px-2 py-1 rounded">
        Nachher
      </span>
    </div>
  );
}

interface ImageUploadSlotProps {
  label: string;
  image: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  readOnly: boolean;
  isPrimary?: boolean;
}

function ImageUploadSlot({
  label,
  image,
  onUpload,
  onRemove,
  readOnly,
  isPrimary = false,
}: ImageUploadSlotProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  if (image) {
    return (
      <div className="relative">
        <img
          src={image}
          alt={label}
          className={cn(
            "w-full aspect-square object-cover rounded-lg",
            isPrimary && "border-2 border-primary"
          )}
        />
        {!readOnly && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-2 py-0.5 rounded">
          {label}
        </span>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    );
  }

  return (
    <Label
      className={cn(
        "aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
        isPrimary
          ? "border-primary/50 hover:border-primary hover:bg-primary/5"
          : "border-muted-foreground/30 hover:border-muted-foreground hover:bg-muted/50"
      )}
    >
      <Camera className={cn("h-6 w-6 mb-1", isPrimary ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-xs", isPrimary ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </Label>
  );
}

export default BeforeAfterComparison;
