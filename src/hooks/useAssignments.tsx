import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { Assignment, CreateAssignmentInput } from "@/types/team";

export function useAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["assignments", user?.id],
    queryFn: async (): Promise<Assignment[]> => {
      if (!user) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          employee:employees(id, full_name, email, role, status),
          appointment:appointments(id, date, time, status, notes)
        `)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Assignment[];
    },
    enabled: !!user,
  });
}

export function useUnassignedAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unassigned-appointments", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Nicht angemeldet");

      // Get all appointment IDs that already have assignments
      const { data: assigned, error: assignedError } = await supabase
        .from("assignments")
        .select("appointment_id")
        .eq("provider_id", user.id)
        .neq("status", "cancelled");

      if (assignedError) throw assignedError;

      const assignedIds = (assigned ?? []).map((a) => a.appointment_id);

      // Get appointments that are NOT assigned
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("provider_id", user.id)
        .in("status", ["scheduled", "confirmed"])
        .order("date", { ascending: true });

      if (assignedIds.length > 0) {
        // Filter out already-assigned appointments
        // Supabase doesn't have a NOT IN, so we use .not().in()
        query = query.not("id", "in", `(${assignedIds.join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useCreateAssignment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      if (!user) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase
        .from("assignments")
        .insert({
          provider_id: user.id,
          appointment_id: input.appointment_id,
          employee_id: input.employee_id,
          notes: input.notes ?? null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-appointments"] });
      toast({ title: "Termin zugewiesen" });
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

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Assignment["status"];
    }) => {
      const { error } = await supabase
        .from("assignments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast({ title: "Status aktualisiert" });
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

export function useCancelAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assignments")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-appointments"] });
      toast({ title: "Zuweisung aufgehoben" });
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
