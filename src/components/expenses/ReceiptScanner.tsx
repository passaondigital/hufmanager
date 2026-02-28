import { useState, useRef, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  Loader2,
  ScanLine,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Euro,
  Calendar,
  Package,
  Fuel,
  GraduationCap,
  Wrench,
  Receipt,
  FileText,
  Edit3,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AiDisclosure } from "@/components/legal/AiDisclosure";
interface ReceiptScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

interface ScanResult {
  document_type: string;
  vendor_name?: string;
  total_amount: number;
  tax_amount?: number;
  tax_rate?: number;
  date?: string;
  category: string;
  description: string;
  line_items?: Array<{
    name: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  confidence: number;
}

type ScanStep = "capture" | "scanning" | "review" | "saving";

const CATEGORIES = [
  { value: "material", label: "Material", icon: Package },
  { value: "treibstoff", label: "Treibstoff", icon: Fuel },
  { value: "fortbildung", label: "Fortbildung", icon: GraduationCap },
  { value: "werkzeug", label: "Werkzeug", icon: Wrench },
  { value: "sonstiges", label: "Sonstiges", icon: Receipt },
] as const;

const DOC_TYPE_LABELS: Record<string, string> = {
  quittung: "Quittung",
  rechnung: "Rechnung",
  kassenbon: "Kassenbon",
  tankbeleg: "Tankbeleg",
  lieferschein: "Lieferschein",
  sonstiges: "Sonstiger Beleg",
};

export function ReceiptScanner({ isOpen, onClose, onBack }: ReceiptScannerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ScanStep>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [category, setCategory] = useState("sonstiges");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetAll = useCallback(() => {
    setStep("capture");
    setImagePreview(null);
    setImageBlob(null);
    setScanResult(null);
    setIsEditing(false);
    setAmount("");
    setExpenseDate("");
    setCategory("sonstiges");
    setDescription("");
    setVendorName("");
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Foto aufnehmen oder auswählen");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Bild zu groß (max. 15MB)");
      return;
    }

    setImageBlob(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      startScan(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startScan = async (base64Image: string) => {
    setStep("scanning");

    try {
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64Image },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setStep("capture");
        return;
      }

      const result = data as ScanResult;
      setScanResult(result);

      // Pre-fill editable fields
      setAmount(result.total_amount?.toString() || "");
      setExpenseDate(result.date || format(new Date(), "yyyy-MM-dd"));
      setCategory(result.category || "sonstiges");
      setDescription(result.description || "");
      setVendorName(result.vendor_name || "");

      setStep("review");
    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Beleg konnte nicht analysiert werden");
      setStep("capture");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nicht angemeldet");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Ungültiger Betrag");

      setStep("saving");

      // Upload receipt image
      let receiptUrl: string | null = null;
      if (imageBlob) {
        const fileExt = imageBlob.type.split("/")[1] || "jpg";
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, imageBlob, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("documents")
            .getPublicUrl(fileName);
          receiptUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: parseFloat(amount),
        expense_date: expenseDate || format(new Date(), "yyyy-MM-dd"),
        category,
        description: [vendorName, description].filter(Boolean).join(" – ") || null,
        receipt_url: receiptUrl,
        is_recurring: false,
        recurring_interval: null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Beleg erfolgreich erfasst");
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Speichern");
      setStep("review");
    },
  });

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-green-500";
    if (c >= 0.5) return "text-amber-500";
    return "text-red-500";
  };

  const confidenceLabel = (c: number) => {
    if (c >= 0.8) return "Hohe Sicherheit";
    if (c >= 0.5) return "Mittlere Sicherheit";
    return "Niedrige Sicherheit – bitte prüfen";
  };

  const isBusy = step === "scanning" || step === "saving";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <ScanLine className="h-5 w-5 text-primary" />
            Intelligente Belegerfassung
          </DialogTitle>
        </DialogHeader>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageCapture}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleImageCapture}
        />

        <AnimatePresence mode="wait">
          {/* STEP 1: Capture */}
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="text-center space-y-3">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <ScanLine className="h-10 w-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Fotografiere oder lade einen Beleg hoch. Die KI erkennt automatisch Betrag, Datum, Kategorie und Beschreibung.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-xs">Foto aufnehmen</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs">Bild hochladen</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Scanning */}
          {step === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-8 text-center space-y-4"
            >
              {imagePreview && (
                <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden border relative">
                  <img
                    src={imagePreview}
                    alt="Beleg"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <p className="font-medium">KI analysiert Beleg...</p>
                <p className="text-sm text-muted-foreground">
                  Betrag, Datum und Kategorie werden erkannt
                </p>
                <AiDisclosure context="Belegerfassung" className="justify-center mt-2" />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Review */}
          {step === "review" && scanResult && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-2"
            >
              {/* Confidence + Doc Type + AI Disclosure */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {DOC_TYPE_LABELS[scanResult.document_type] || scanResult.document_type}
                </Badge>
                <div className="flex items-center gap-3">
                  <AiDisclosure context="Belegerfassung" />
                  <div className={cn("flex items-center gap-1 text-xs", confidenceColor(scanResult.confidence))}>
                    {scanResult.confidence >= 0.8 ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {confidenceLabel(scanResult.confidence)}
                  </div>
                </div>
              </div>

              {/* Image Preview Mini */}
              {imagePreview && (
                <div className="flex gap-3 items-start">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0">
                    <img src={imagePreview} alt="Beleg" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{vendorName || "Unbekannter Aussteller"}</p>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Extracted / Editable Fields */}
              <div className="space-y-3">
                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Euro className="h-3 w-3" /> Betrag
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={!isEditing}
                      className={cn("pr-8", !isEditing && "bg-muted")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Datum
                  </Label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    disabled={!isEditing}
                    className={cn(!isEditing && "bg-muted")}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Kategorie</Label>
                  <Select value={category} onValueChange={setCategory} disabled={!isEditing}>
                    <SelectTrigger className={cn(!isEditing && "bg-muted")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendor */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Aussteller</Label>
                  <Input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="z.B. Tankstelle XY"
                    className={cn(!isEditing && "bg-muted")}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isEditing}
                    rows={2}
                    className={cn(!isEditing && "bg-muted")}
                  />
                </div>

                {/* Line Items */}
                {scanResult.line_items && scanResult.line_items.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Erkannte Positionen</Label>
                    <div className="border rounded-lg divide-y text-xs">
                      {scanResult.line_items.map((item, i) => (
                        <div key={i} className="flex justify-between px-3 py-1.5">
                          <span className="truncate flex-1">
                            {item.quantity && `${item.quantity}x `}{item.name}
                          </span>
                          {item.total != null && (
                            <span className="font-medium ml-2">
                              {item.total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tax info */}
                {(scanResult.tax_amount != null || scanResult.tax_rate != null) && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {scanResult.tax_rate != null && <span>MwSt: {scanResult.tax_rate}%</span>}
                    {scanResult.tax_amount != null && (
                      <span>
                        MwSt-Betrag: {scanResult.tax_amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 4: Saving */}
          {step === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center space-y-3"
            >
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Beleg wird gespeichert...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {step === "review" && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={resetAll} disabled={isBusy}>
              <Camera className="h-4 w-4 mr-2" />
              Neuer Scan
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isBusy}>
                Abbrechen
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={isBusy || !amount}
                className="bg-primary hover:bg-primary/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Freigeben & Speichern
              </Button>
            </div>
          </DialogFooter>
        )}

        {step === "capture" && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
