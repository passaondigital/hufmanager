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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  Upload, 
  X, 
  Loader2, 
  Euro,
  Package,
  Fuel,
  GraduationCap,
  Wrench,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: "material", label: "Material", icon: Package },
  { value: "treibstoff", label: "Treibstoff", icon: Fuel },
  { value: "fortbildung", label: "Fortbildung", icon: GraduationCap },
  { value: "werkzeug", label: "Werkzeug", icon: Wrench },
  { value: "sonstiges", label: "Sonstiges", icon: Receipt },
] as const;

export function AddExpenseModal({ isOpen, onClose }: AddExpenseModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<string>("material");
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>("monthly");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount("");
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setCategory("material");
    setDescription("");
    setReceiptUrl(null);
    setIsRecurring(false);
    setRecurringInterval("monthly");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Bitte nur Bilder oder PDFs hochladen");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 10MB)");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      setReceiptUrl(urlData.publicUrl);
      toast.success("Beleg hochgeladen");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nicht angemeldet");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Ungültiger Betrag");

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        category,
        description: description || null,
        receipt_url: receiptUrl,
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Ausgabe gespeichert");
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Speichern");
    },
  });

  const isSubmitting = createMutation.isPending || uploading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Ausgabe erfassen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Betrag
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="expense-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datum
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              placeholder="z.B. 20L Diesel, Tankstelle XY..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Beleg / Quittung
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {receiptUrl ? (
              <div className="relative inline-block">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Beleg hochgeladen</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => setReceiptUrl(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Hochladen...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Beleg hochladen
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Recurring Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="recurring" className="cursor-pointer">
                Wiederkehrend?
              </Label>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
            
            {isRecurring && (
              <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                  <SelectItem value="yearly">Jährlich</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={isSubmitting || !amount}
            className="bg-[#F47B20] hover:bg-[#F47B20]/90 text-white"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              "Ausgabe speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
