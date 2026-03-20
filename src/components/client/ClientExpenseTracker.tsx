import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Camera, Plus, Receipt, PiggyBank, TrendingUp, FileText,
  ShoppingCart, Home, Stethoscope, Scissors, Pill, Truck, MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EXPENSE_CATEGORIES = [
  { value: "stallmiete", label: "Stallmiete", icon: Home },
  { value: "futter", label: "Futter & Heu", icon: ShoppingCart },
  { value: "tierarzt", label: "Tierarzt", icon: Stethoscope },
  { value: "hufpflege", label: "Hufpflege", icon: Scissors },
  { value: "medikamente", label: "Medikamente", icon: Pill },
  { value: "transport", label: "Transport", icon: Truck },
  { value: "ausruestung", label: "Ausrüstung", icon: ShoppingCart },
  { value: "versicherung", label: "Versicherung", icon: FileText },
  { value: "sonstiges", label: "Sonstiges", icon: MoreHorizontal },
];

interface ExpenseEntry {
  id: string;
  category: string;
  title: string;
  amount: number;
  date: string;
  notes?: string;
  receipt_url?: string;
}

interface AddExpenseDialogProps {
  onAdd: (expense: Omit<ExpenseEntry, "id">) => void;
}

function AddExpenseDialog({ onAdd }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("sonstiges");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!title.trim() || !amount) {
      toast.error("Bitte Titel und Betrag ausfüllen.");
      return;
    }
    onAdd({
      category,
      title: title.trim(),
      amount: parseFloat(amount),
      date,
      notes: notes.trim() || undefined,
    });
    setTitle("");
    setAmount("");
    setNotes("");
    setOpen(false);
    toast.success("Ausgabe erfasst!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Ausgabe erfassen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Ausgabe erfassen
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Titel *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Heu-Lieferung Mai"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Betrag (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Datum</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notiz (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Infos..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="p-3 border border-dashed border-border rounded-lg text-center">
            <Camera className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
            <p className="text-xs text-muted-foreground">Quittung fotografieren</p>
            <p className="text-[10px] text-muted-foreground">(Bald verfügbar)</p>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Ausgabe speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClientExpenseTracker() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([
    // Demo data
    { id: "1", category: "stallmiete", title: "Stallmiete Juni", amount: 380, date: "2026-03-01" },
    { id: "2", category: "futter", title: "Heu-Lieferung", amount: 145, date: "2026-03-05" },
    { id: "3", category: "tierarzt", title: "Impfung + Check-up", amount: 210, date: "2026-03-12" },
    { id: "4", category: "hufpflege", title: "Barhufbearbeitung", amount: 85, date: "2026-03-15" },
  ]);

  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = (expense: Omit<ExpenseEntry, "id">) => {
    setExpenses((prev) => [
      { ...expense, id: crypto.randomUUID() },
      ...prev,
    ]);
  };

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Ausgaben diesen Monat</p>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(totalMonth)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {Object.entries(categoryTotals).map(([cat, total]) => {
              const cfg = EXPENSE_CATEGORIES.find((c) => c.value === cat);
              return (
                <div key={cat} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {cfg && <cfg.icon className="h-3 w-3" />}
                  <span>{cfg?.label || cat}</span>
                  <span className="font-medium text-foreground">{total.toFixed(0)}€</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-primary" />
          Ausgaben
        </h3>
        <AddExpenseDialog onAdd={handleAdd} />
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        {expenses.map((expense) => {
          const cfg = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
          const CatIcon = cfg?.icon || MoreHorizontal;
          return (
            <Card key={expense.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{expense.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {cfg?.label} · {new Date(expense.date).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  -{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(expense.amount)}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
