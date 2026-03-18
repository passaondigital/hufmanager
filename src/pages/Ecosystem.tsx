import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EcosystemConnect } from "@/components/ecosystem/EcosystemConnect";
import { EcosystemHealthDashboard } from "@/components/ecosystem/EcosystemHealthDashboard";
import { EcosystemSettingsPanel } from "@/components/ecosystem/EcosystemSettingsPanel";
import { useEcosystemStats } from "@/hooks/useEcosystemStats";
import { useAuth } from "@/hooks/useAuth";
import { Globe, BarChart3, Settings } from "lucide-react";

export default function Ecosystem() {
  const { user } = useAuth();
  const { data, refetch } = useEcosystemStats();

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <Tabs defaultValue="connect" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connect" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Apps</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Einstellungen</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connect">
          <EcosystemConnect />
        </TabsContent>

        <TabsContent value="health">
          {user ? (
            <EcosystemHealthDashboard />
          ) : (
            <p className="text-center text-muted-foreground py-12">Bitte anmelden.</p>
          )}
        </TabsContent>

        <TabsContent value="settings">
          {user && data ? (
            <EcosystemSettingsPanel settings={data.settings} onUpdate={refetch} />
          ) : (
            <p className="text-center text-muted-foreground py-12">Bitte anmelden.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
