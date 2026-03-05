import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeList, ProviderControlCenter } from "@/components/team";
import { AbsenceManagement } from "@/components/team/AbsenceManagement";
import { MaterialAssignment } from "@/components/team/MaterialAssignment";
import { Users, LayoutDashboard, CalendarOff, Package } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">Team-Verwaltung <HelpTip id="team.bereich" /></h1>
        <p className="text-muted-foreground">
          Verwalte dein Team, weise Termine zu und behalte den Überblick
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Übersicht</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Mitarbeiter</span>
          </TabsTrigger>
          <TabsTrigger value="absences" className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4" />
            <span className="hidden sm:inline">Abwesenheiten</span>
          </TabsTrigger>
          <TabsTrigger value="material" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Material</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProviderControlCenter />
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <EmployeeList />
        </TabsContent>

        <TabsContent value="absences" className="space-y-6">
          <AbsenceManagement />
        </TabsContent>

        <TabsContent value="material" className="space-y-6">
          <MaterialAssignment />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamPage;
