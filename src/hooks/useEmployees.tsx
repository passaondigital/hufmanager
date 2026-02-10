import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type {
  Employee,
  EmployeeInvite,
  CreateEmployeeInviteInput,
  UpdateEmployeeInput,
} from "@/types/team";

export function useEmployees() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["employees", user?.id],
    queryFn: async (): Promise<Employee[]> => {
      if (!user) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as Employee[];
    },
    enabled: !!user,
  });
}

export function useEmployeeInvites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["employee-invites", user?.id],
    queryFn: async (): Promise<EmployeeInvite[]> => {
      if (!user) throw new Error("Nicht angemeldet");

      const { data, error } = await supabase
        .from("employee_invites")
        .select("*")
        .eq("provider_id", user.id)
        .is("used_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as EmployeeInvite[];
    },
    enabled: !!user,
  });
}

export function useCreateEmployee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInviteInput) => {
      if (!user) throw new Error("Nicht angemeldet");

      // Create employee directly (for manual add without invite flow)
      const { data, error } = await supabase
        .from("employees")
        .insert({
          provider_id: user.id,
          email: input.email,
          full_name: input.full_name,
          role: input.role,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Mitarbeiter angelegt" });
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

export function useCreateInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInviteInput) => {
      if (!user) throw new Error("Nicht angemeldet");

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { data, error } = await supabase
        .from("employee_invites")
        .insert({
          provider_id: user.id,
          email: input.email,
          full_name: input.full_name,
          role: input.role,
          invite_token: token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as EmployeeInvite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-invites"] });
      toast({ title: "Einladung erstellt" });
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

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateEmployeeInput;
    }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Mitarbeiter aktualisiert" });
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

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Mitarbeiter deaktiviert" });
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
