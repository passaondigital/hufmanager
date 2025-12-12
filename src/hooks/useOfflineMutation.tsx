import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TableName = "appointments" | "horses" | "contacts" | "hoof_photos" | 
  "horse_documents" | "invoices" | "leads" | "messages";

interface OfflineMutationOptions<TData, TError, TVariables> {
  table: TableName;
  type: "create" | "update" | "delete";
  invalidateQueries?: string[];
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: TError, variables: TVariables, context: unknown) => void;
}

/**
 * Custom hook for mutations that work offline
 * Queues mutations when offline and syncs when back online
 */
export function useOfflineMutation<
  TData = unknown,
  TError = Error,
  TVariables extends Record<string, unknown> = Record<string, unknown>
>(options: OfflineMutationOptions<TData, TError, TVariables>) {
  const queryClient = useQueryClient();
  const { table, type, invalidateQueries = [], ...mutationOptions } = options;

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    mutationFn: async (variables) => {
      // Check if online
      if (!navigator.onLine) {
        // Queue the mutation for later
        await addToSyncQueue({
          type,
          table,
          data: variables,
        });
        
        toast.info("Offline - Änderung wird synchronisiert sobald du online bist", {
          icon: "⏳",
        });

        // Return optimistic data for UI update
        return {
          ...variables,
          id: variables.id || crypto.randomUUID(),
          _offline: true,
        } as TData;
      }

      // Online - execute mutation directly
      let result;
      
      switch (type) {
        case "create":
          result = await (supabase.from(table) as any).insert(variables).select().single();
          break;
        case "update":
          if (!variables.id) throw new Error("Update requires an ID");
          result = await (supabase.from(table) as any)
            .update(variables)
            .eq("id", variables.id)
            .select()
            .single();
          break;
        case "delete":
          if (!variables.id) throw new Error("Delete requires an ID");
          result = await (supabase.from(table) as any)
            .delete()
            .eq("id", variables.id);
          return { success: true } as TData;
        default:
          throw new Error(`Unknown mutation type: ${type}`);
      }

      if (result.error) {
        throw result.error;
      }

      return result.data as TData;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      mutationOptions.onSuccess?.(data, variables, context as any);
    },
    onError: async (error, variables, context) => {
      // If mutation failed due to network, queue it
      if (error instanceof Error && error.message.includes("network")) {
        await addToSyncQueue({
          type,
          table,
          data: variables,
        });
        
        toast.info("Änderung wird synchronisiert sobald du online bist", {
          icon: "⏳",
        });
      }
      
      mutationOptions.onError?.(error, variables, context as any);
    },
  });
}
