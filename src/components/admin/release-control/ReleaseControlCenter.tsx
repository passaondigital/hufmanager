import { ShieldAlert, History, Server, Camera, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmergencyPanel } from './EmergencyPanel';
import { ReleaseHistory } from './ReleaseHistory';
import { InstanceVersionControl } from './InstanceVersionControl';
import { ConfigSnapshots } from './ConfigSnapshots';

export function ReleaseControlCenter() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="emergency" className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="emergency" className="gap-1.5 min-h-[40px] text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">Notfall</span>
            </TabsTrigger>
            <TabsTrigger value="instances" className="gap-1.5 min-h-[40px] text-xs">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline">Instanzen</span>
            </TabsTrigger>
            <TabsTrigger value="releases" className="gap-1.5 min-h-[40px] text-xs">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Releases</span>
            </TabsTrigger>
            <TabsTrigger value="snapshots" className="gap-1.5 min-h-[40px] text-xs">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Snapshots</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Notfall-Modus & Kill Switch
              </CardTitle>
              <CardDescription>
                Sofortige Sperrung einzelner oder aller Instanzen. Force-Reload für alle Clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmergencyPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instances">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-5 w-5" />
                Instanz-Versionskontrolle
              </CardTitle>
              <CardDescription>
                Mindestversionen, erzwungene Updates und Status für jede Instanz einzeln steuern.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InstanceVersionControl />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="releases">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5" />
                Release-Verlauf & Changelog
              </CardTitle>
              <CardDescription>
                Vollständiger Versionsverlauf mit Release Notes, Breaking Changes und Rollback-Optionen.
                Jedes Release durchläuft: Entwurf → Prüfung → Freigabe → Deploy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReleaseHistory />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-5 w-5" />
                Config-Snapshots & Sicherungen
              </CardTitle>
              <CardDescription>
                Sichere den aktuellen Stand aller Einstellungen vor Änderungen. Jederzeit wiederherstellbar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigSnapshots />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
