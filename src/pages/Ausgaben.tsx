import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  Receipt, 
  Fuel, 
  GraduationCap, 
  Wrench, 
  Package,
  MoreHorizontal,
  Trash2,
  Repeat,
  Image as ImageIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  expense_date: string;
  category: "material" | "treibstoff" | "fortbildung" | "werkzeug" | "sonstiges";
  description: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_interval: "monthly" | "yearly" | null;
  created_at: string;
}

const CATEGORY_CONFIG = {
  material: { label: "Material", icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
  treibstoff: { label: "Treibstoff", icon: Fuel, color: "text-amber-500", bg: "bg-amber-500/10" },
  fortbildung: { label: "Fortbildung", icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" },
  werkzeug: { label: "Werkzeug", icon: Wrench, color: "text-green-500", bg: "bg-green-500/10" },
  sonstiges: { label: "Sonstiges", icon: Receipt, color: "text-muted-foreground", bg: "bg-muted" },
} as const;

export default function Ausgaben() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user!.id)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user,
  });

  // Fetch invoices for profit calculation
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("total_amount, issue_date, status")
        .eq("provider_id", user!.id)
        .gte("issue_date", format(monthStart, "yyyy-MM-dd"))
        .lte("issue_date", format(monthEnd, "yyyy-MM-dd"));
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Ausgabe gelöscht");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Fehler beim Löschen");
    },
  });

  // Calculate summaries
  const thisMonthExpenses = expenses.filter((e) => {
    const date = new Date(e.expense_date);
    return date >= monthStart && date <= monthEnd;
  });

  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryTotals = thisMonthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const totalInvoicesThisMonth = invoices
    .filter((inv) => inv.status !== "cancelled")
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const indicativeProfit = totalInvoicesThisMonth - totalThisMonth;

  const isLoading = expensesLoading || invoicesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ausgaben</h1>
          <p className="text-muted-foreground">Verwalte deine Betriebskosten</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#F47B20] hover:bg-[#F47B20]/90">
          <Plus className="h-4 w-4 mr-2" />
          Neue Ausgabe
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total This Month */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Ausgaben diesen Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              -{totalThisMonth.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {thisMonthExpenses.length} Einträge
            </p>
          </CardContent>
        </Card>

        {/* Top Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Größter Posten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategory ? (
              <>
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = CATEGORY_CONFIG[topCategory[0] as keyof typeof CATEGORY_CONFIG];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={cn("p-2 rounded-lg", config.bg)}>
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <p className="text-xl font-bold text-foreground">{config.label}</p>
                      </>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {topCategory[1].toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Keine Daten</p>
            )}
          </CardContent>
        </Card>

        {/* Indicative Profit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Gewinn (Indikativ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              "text-3xl font-bold",
              indicativeProfit >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {indicativeProfit.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Rechnungen: {totalInvoicesThisMonth.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Ausgaben</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Noch keine Ausgaben erfasst</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Erste Ausgabe hinzufügen
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const config = CATEGORY_CONFIG[expense.category];
                    const Icon = config.icon;
                    return (
                      <TableRow key={expense.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(expense.expense_date), "dd.MM.yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded", config.bg)}>
                              <Icon className={cn("h-3.5 w-3.5", config.color)} />
                            </div>
                            <span className="text-sm">{config.label}</span>
                            {expense.is_recurring && (
                              <Repeat className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <div className="flex items-center gap-2">
                            {expense.description || "-"}
                            {expense.receipt_url && (
                              <ImageIcon className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap text-destructive">
                          -{Number(expense.amount).toLocaleString("de-DE", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(expense.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ausgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Ausgabe wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
