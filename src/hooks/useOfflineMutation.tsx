import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToSyncQueue } from "@/lib/offline/syncQueue";
import { OfflineMutationTable, OFFLINE_MUTATION_TABLES } from "@/lib/offline/offlineConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfflineMutationOptions<TData, TError, TVariables> {
  table: OfflineMutationTable;
  type: "create" | "update" | "delete";
  invalidateQueries?: string[];
  optimisticUpdate?: (variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables, context: unknown) => void;
  onError?: (error: TError, variables: TVariables, context: unknown) => void;
  // Silent mode: don't show toasts for offline queueing
  silent?: boolean;
}

/**
 * Custom hook for mutations that work offline
 * - Shows optimistic UI immediately
 * - Queues mutations when offline
 * - Auto-syncs when back online
 */
export function useOfflineMutation<
  TData = unknown,
  TError = Error,
  TVariables extends Record<string, unknown> = Record<string, unknown>
>(options: OfflineMutationOptions<TData, TError, TVariables>) {
  const queryClient = useQueryClient();
  const { 
    table, 
    type, 
    invalidateQueries = [], 
    optimisticUpdate,
    silent = false,
    ...mutationOptions 
  } = options;

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
        
        if (!silent) {
          toast.info("Offline - Änderung wird synchronisiert", {
            description: "Sobald du online bist, werden die Daten übertragen.",
            icon: "📶",
            duration: 3000,
          });
        }

        // Return optimistic data for UI update
        if (optimisticUpdate) {
          return optimisticUpdate(variables);
        }
        
        return {
          ...variables,
          id: variables.id || crypto.randomUUID(),
          _offline: true,
          _pendingSync: true,
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
      // If mutation failed due to network, queue it silently
      const isNetworkError = 
        error instanceof Error && 
        (error.message.includes("network") || 
         error.message.includes("fetch") ||
         error.message.includes("Failed to fetch"));
      
      if (isNetworkError) {
        await addToSyncQueue({
          type,
          table,
          data: variables,
        });
        
        if (!silent) {
          toast.info("Offline - Änderung wird synchronisiert", {
            description: "Die Daten werden automatisch übertragen.",
            icon: "📶",
            duration: 3000,
          });
        }
        return; // Don't call error handler for network errors
      }
      
      mutationOptions.onError?.(error, variables, context as any);
    },
  });
}

/**
 * Hook for static data queries with infinite stale time
 * Data is shown immediately from cache, then revalidated in background
 */
export function useOfflineQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    // Show cached data immediately
    staleTime: options?.staleTime ?? Infinity,
    // Keep data for 7 days
    gcTime: 1000 * 60 * 60 * 24 * 7,
    // Revalidate in background when window regains focus
    refetchOnWindowFocus: navigator.onLine,
    // Don't refetch on mount if we have cached data
    refetchOnMount: "always",
    enabled: options?.enabled ?? true,
    // Retry only when online
    retry: (failureCount: number) => {
      if (!navigator.onLine) return false;
      return failureCount < 3;
    },
  });
}
