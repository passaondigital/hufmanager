import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeList, ProviderControlCenter } from "@/components/team";
import { Users, LayoutDashboard, UserPlus, Calendar, FileCheck, Clock } from "lucide-react";

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Team-Verwaltung</h1>
        <p className="text-muted-foreground">
          Verwalte dein Team, weise Termine zu und behalte den Überblick
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Übersicht</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Mitarbeiter</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProviderControlCenter />
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <EmployeeList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamPage;
