/**
 * Data Access Layer: Invoice Service
 * Centralized, typed queries for invoices and expenses.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: string;
  invoice_number: string | null;
  status: string | null;
  total_amount: number;
  issue_date: string;
  due_date: string | null;
  client_id: string;
  provider_id: string | null;
  created_at: string;
}

export interface ExpenseListItem {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  receipt_url: string | null;
  is_recurring: boolean;
  user_id: string;
}

// ── Select strings ───────────────────────────────────────────────────

const INVOICE_LIST_SELECT = "id, invoice_number, status, total_amount, issue_date, due_date, client_id, provider_id, created_at";
const EXPENSE_LIST_SELECT = "id, amount, category, description, expense_date, receipt_url, is_recurring, user_id";

// ── Functions ────────────────────────────────────────────────────────

export async function fetchInvoicesByProvider(
  providerId: string,
  dateFrom?: string,
  dateTo?: string,
  limit = 200
): Promise<InvoiceListItem[]> {
  let query = supabase
    .from("invoices")
    .select(INVOICE_LIST_SELECT)
    .eq("provider_id", providerId)
    .order("issue_date", { ascending: false })
    .limit(limit);

  if (dateFrom) query = query.gte("issue_date", dateFrom);
  if (dateTo) query = query.lte("issue_date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InvoiceListItem[];
}

export async function fetchExpensesByUser(
  userId: string,
  dateFrom?: string,
  dateTo?: string,
  limit = 200
): Promise<ExpenseListItem[]> {
  let query = supabase
    .from("expenses")
    .select(EXPENSE_LIST_SELECT)
    .eq("user_id", userId)
    .order("expense_date", { ascending: false })
    .limit(limit);

  if (dateFrom) query = query.gte("expense_date", dateFrom);
  if (dateTo) query = query.lte("expense_date", dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ExpenseListItem[];
}
