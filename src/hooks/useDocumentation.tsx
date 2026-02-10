import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { DocumentationItem, WorkEvent, WorkEventType } from "@/types/team";

export function usePendingDocumentation() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-documentation", user?.id],
    queryFn: async (): Promise<DocumentationItem[]> => {
      if (!user) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase
        .from("documentation_items")
        .select(`
          *,
          employee:employees(id, full_name, email),
          assignment:assignments(id, status, appointment_id)
        `)
        .eq("provider_id", user.id)
        .eq("approval_status", "pending")
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as DocumentationItem[];
    },
    enabled: !!user,
  });
}

export function useApproveDocumentation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      providerNotes,
    }: {
      id: string;
      providerNotes?: string;
    }) => {
      const { error } = await supabase
        .from("documentation_items")
        .update({
          approval_status: "approved",
          approved_at: new Date().toISOString(),
          provider_notes: providerNotes ?? null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-documentation"] });
      toast({ title: "Dokumentation freigegeben" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRejectDocumentation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      providerNotes,
    }: {
      id: string;
      providerNotes?: string;
    }) => {
      const { error } = await supabase
        .from("documentation_items")
        .update({
          approval_status: "rejected",
          provider_notes: providerNotes ?? null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-documentation"] });
      toast({ title: "Dokumentation abgelehnt" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Employee-side hooks

export function useCreateWorkEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      employeeId,
      providerId,
      eventType,
      location,
    }: {
      assignmentId: string;
      employeeId: string;
      providerId: string;
      eventType: WorkEventType;
      location?: { lat: number; lng: number };
    }) => {
      const { data, error } = await supabase
        .from("work_events")
        .insert({
          assignment_id: assignmentId,
          employee_id: employeeId,
          provider_id: providerId,
          event_type: eventType,
          location_lat: location?.lat ?? null,
          location_lng: location?.lng ?? null,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update assignment status based on event type
      const statusMap: Partial<Record<WorkEventType, string>> = {
        en_route: "en_route",
        check_in: "checked_in",
        check_out: "checked_out",
      };

      const newStatus = statusMap[eventType];
      if (newStatus) {
        await supabase
          .from("assignments")
          .update({ status: newStatus })
          .eq("id", assignmentId);
      }

      return data as unknown as WorkEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["work-events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateDocumentationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      employeeId,
      providerId,
      appointmentId,
      itemType,
      content,
    }: {
      assignmentId: string;
      employeeId: string;
      providerId: string;
      appointmentId: string;
      itemType: "photo" | "note" | "video";
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("documentation_items")
        .insert({
          assignment_id: assignmentId,
          employee_id: employeeId,
          provider_id: providerId,
          appointment_id: appointmentId,
          item_type: itemType,
          content,
          approval_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as DocumentationItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentation-items"] });
      toast({ title: "Dokumentation gespeichert" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
