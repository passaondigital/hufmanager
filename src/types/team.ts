// Team & Employee Management Types

export type EmployeeRole = "assistant" | "employee" | "teamlead" | "provider";
export type EmployeeStatus = "active" | "sick" | "vacation" | "suspended" | "inactive";
export type EmploymentType = "employee" | "contractor" | "apprentice";
export type AssignmentStatus =
  | "pending"
  | "accepted"
  | "en_route"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled";
export type WorkEventType =
  | "en_route"
  | "check_in"
  | "check_out"
  | "note_added"
  | "photo_added";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Employee {
  id: string;
  provider_id: string;
  email: string;
  full_name: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  employment_type: EmploymentType | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  can_work_alone: boolean;
  can_document: boolean;
  can_communicate_with_customers: boolean;
  created_at: string;
  last_seen: string | null;
}

export interface EmployeeInvite {
  id: string;
  provider_id: string;
  email: string;
  role: EmployeeRole;
  invite_token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  provider_id: string;
  appointment_id: string;
  employee_id: string;
  status: AssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: Employee;
  appointment?: {
    id: string;
    date: string;
    time: string | null;
    status: string;
    notes: string | null;
    customer_name?: string;
    horse_name?: string;
  };
}

export interface WorkEvent {
  id: string;
  provider_id: string;
  assignment_id: string;
  employee_id: string;
  event_type: WorkEventType;
  timestamp: string;
  location_lat: number | null;
  location_lng: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DocumentationItem {
  id: string;
  provider_id: string;
  assignment_id: string;
  employee_id: string;
  appointment_id: string;
  item_type: "photo" | "note" | "video";
  content: string;
  approval_status: ApprovalStatus;
  provider_notes: string | null;
  created_at: string;
  approved_at: string | null;
  deleted: boolean;
  // Joined data
  employee?: Employee;
  assignment?: Assignment;
}

// Form types for creating/editing
export interface CreateEmployeeInviteInput {
  email: string;
  role: EmployeeRole;
  full_name: string;
}

export interface UpdateEmployeeInput {
  role?: EmployeeRole;
  status?: EmployeeStatus;
  can_work_alone?: boolean;
  can_document?: boolean;
  can_communicate_with_customers?: boolean;
}

export interface CreateAssignmentInput {
  appointment_id: string;
  employee_id: string;
  notes?: string;
}

// Display helpers
export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  assistant: "Helfer",
  employee: "Mitarbeiter",
  teamlead: "Teamleiter",
  provider: "Inhaber",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Aktiv",
  sick: "Krank",
  vacation: "Urlaub",
  suspended: "Gesperrt",
  inactive: "Inaktiv",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employee: "Angestellt",
  contractor: "Freiberuflich",
  apprentice: "Auszubildend",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: "Offen",
  accepted: "Angenommen",
  en_route: "Unterwegs",
  checked_in: "Vor Ort",
  checked_out: "Abgeschlossen",
  completed: "Erledigt",
  cancelled: "Abgesagt",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Ausstehend",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};
