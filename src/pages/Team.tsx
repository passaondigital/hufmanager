import { useState } from "react";
import { Loader2, UserPlus, UsersRound, ClipboardCheck, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeList } from "@/components/team/EmployeeList";
import { AssignmentTable } from "@/components/team/AssignmentTable";
import { InviteEmployeeDialog } from "@/components/team/InviteEmployeeDialog";
import { AssignAppointmentDialog } from "@/components/team/AssignAppointmentDialog";
import { DocumentationReviewCard } from "@/components/team/DocumentationReviewCard";
import { useEmployees } from "@/hooks/useEmployees";
import { useAssignments } from "@/hooks/useAssignments";
import { usePendingDocumentation } from "@/hooks/useDocumentation";

const Team = () => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: assignments = [], isLoading: loadingAssignments } = useAssignments();
  const { data: pendingDocs = [], isLoading: loadingDocs } = usePendingDocumentation();

  const activeEmployees = employees.filter((e) => e.status === "active");
  const pendingAssignments = assignments.filter(
    (a) => !["completed", "cancelled"].includes(a.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mitarbeiter, Zuweisungen und Dokumentation verwalten
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Termin zuweisen
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Mitarbeiter hinzuf\u00fcgen
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Aktive Mitarbeiter</p>
          <p className="text-2xl font-bold text-foreground">
            {loadingEmployees ? "\u2013" : activeEmployees.length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Offene Zuweisungen</p>
          <p className="text-2xl font-bold text-foreground">
            {loadingAssignments ? "\u2013" : pendingAssignments.length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Zu pr\u00fcfen</p>
          <p className="text-2xl font-bold text-foreground">
            {loadingDocs ? "\u2013" : pendingDocs.length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Gesamt (inkl. inaktiv)</p>
          <p className="text-2xl font-bold text-foreground">
            {loadingEmployees ? "\u2013" : employees.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees" className="gap-1.5">
            <UsersRound className="h-4 w-4" />
            Mitarbeiter
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            Zuweisungen
            {pendingAssignments.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {pendingAssignments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            <FileCheck className="h-4 w-4" />
            Freigaben
            {pendingDocs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                {pendingDocs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <EmployeeList employees={employees} />
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          {loadingAssignments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AssignmentTable assignments={assignments} />
          )}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          {loadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingDocs.length === 0 ? (
            <div className="border rounded-lg p-8 text-center text-muted-foreground text-sm">
              Keine ausstehenden Freigaben.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDocs.map((doc) => (
                <DocumentationReviewCard key={doc.id} item={doc} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteEmployeeDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <AssignAppointmentDialog open={assignOpen} onOpenChange={setAssignOpen} />
    </div>
  );
};

export default Team;
