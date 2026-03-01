import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type EmployeeRole = "view" | "employee" | "team_lead";
export type EmployeeStatus = "active" | "sick" | "vacation" | "suspended" | "inactive";
export type EmploymentType = "employee" | "contractor";

export interface Employee {
  id: string;
  user_id: string | null;
  provider_id: string;
  organization_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  employment_type: EmploymentType;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_pdf_url: string | null;
  can_work_alone: boolean;
  can_apply_hoof_protection: boolean;
  can_work_sensitive_clients: boolean;
  custom_permissions: Record<string, boolean>;
  invitation_token: string | null;
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
  notes: string | null;
  bio: string | null;
  onboarding_completed: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  full_name: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  employment_type: EmploymentType;
  contract_start_date?: string;
  can_work_alone?: boolean;
  can_apply_hoof_protection?: boolean;
  can_work_sensitive_clients?: boolean;
  notes?: string;
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  status?: EmployeeStatus;
  contract_end_date?: string;
  custom_permissions?: Record<string, boolean>;
}

export function useEmployees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all employees for the current provider
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["employees", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!user?.id,
  });

  // Create new employee
  const createEmployee = useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Generate invitation token
      const invitationToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from("employee_profiles")
        .insert({
          provider_id: user.id,
          full_name: employeeData.full_name,
          email: employeeData.email,
          phone: employeeData.phone || null,
          role: employeeData.role,
          employment_type: employeeData.employment_type,
          contract_start_date: employeeData.contract_start_date || null,
          can_work_alone: employeeData.can_work_alone || false,
          can_apply_hoof_protection: employeeData.can_apply_hoof_protection || false,
          can_work_sensitive_clients: employeeData.can_work_sensitive_clients || false,
          notes: employeeData.notes || null,
          invitation_token: invitationToken,
          status: "inactive", // Inactive until they accept invitation
        })
        .select()
        .single();

      if (error) throw error;
      return data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Mitarbeiter erstellt",
        description: "Der Mitarbeiter wurde erfolgreich angelegt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update employee
  const updateEmployee = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeeData }) => {
      const { data: updated, error } = await supabase
        .from("employee_profiles")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Mitarbeiter aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete employee
  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Mitarbeiter entfernt",
        description: "Der Mitarbeiter wurde erfolgreich entfernt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send invitation email
  const sendInvitation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase.functions.invoke("send-employee-invitation", {
        body: { employeeId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Einladung gesendet",
        description: "Die Einladung wurde per E-Mail versendet.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Senden",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    employees: employees || [],
    isLoading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    sendInvitation,
  };
}

// Hook for employee assignments
export function useEmployeeAssignments(employeeId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["employee-assignments", employeeId || user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_assignments")
        .select(`
          *,
          employee:employee_profiles(id, full_name, email, role),
          appointment:appointments(
            id, date, time, status, notes, location,
            horse:horses(id, name),
            client:profiles!appointments_client_id_fkey(id, full_name)
          )
        `)
        .eq(employeeId ? "employee_id" : "provider_id", employeeId || user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Hook for employee's own profile (for employee view)
export function useEmployeeProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["employee-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("employee_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Employee | null;
    },
    enabled: !!user?.id,
  });
}
