import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldAlert, RefreshCw, Power, Globe, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceSetting {
  key: string;
  value: string;
  is_forced: boolean;
  message: string | null;
}

const INSTANCES = [
  { key: 'maintenance_mode_app', label: 'App (Provider & Client)', icon: Power, description: 'app.hufiapp.de sperren' },
  { key: 'maintenance_mode_landingpage', label: 'Landingpage', icon: Globe, description: 'www.hufiapp.de sperren' },
  { key: 'maintenance_mode_demo', label: 'Demo-Zugänge', icon: Eye, description: 'Alle Demo-Accounts deaktivieren' },
  { key: 'maintenance_mode_mission_control', label: 'Mission Control', icon: Shield, description: 'Admin-Bereich sperren (Vorsicht!)' },
] as const;

export function EmergencyPanel() {
  const queryClient = useQueryClient();
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['maintenance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', [...INSTANCES.map(i => i.key), 'force_reload_all']);
      if (error) throw error;
      return data as MaintenanceSetting[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled, message }: { key: string; enabled: boolean; message?: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: enabled ? 'true' : 'false', 
          message: message || null,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-settings'] });
      toast.success('Status aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const forceReloadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: 'true', message: 'Emergency Force Reload triggered' })
        .eq('key', 'force_reload_all');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-settings'] });
      toast.success('Force-Reload für alle Clients aktiviert');
    },
  });

  const getSetting = (key: string) => settings?.find(s => s.key === key);
  const isActive = (key: string) => getSetting(key)?.value === 'true';
  const anyActive = INSTANCES.some(i => isActive(i.key));

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Emergency Status Banner */}
      {anyActive && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-destructive animate-pulse" />
              <div>
                <p className="font-semibold text-destructive">NOTFALL-MODUS AKTIV</p>
                <p className="text-sm text-muted-foreground">
                  {INSTANCES.filter(i => isActive(i.key)).map(i => i.label).join(', ')} gesperrt
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instance Toggles */}
      <div className="grid gap-3">
        {INSTANCES.map(({ key, label, icon: Icon, description }) => (
          <div 
            key={key}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              isActive(key) ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${isActive(key) ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="font-medium">{label}</Label>
                  {isActive(key) && <Badge variant="destructive" className="text-[10px] px-1.5">GESPERRT</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={isActive(key)}
              onCheckedChange={(checked) => toggleMutation.mutate({ key, enabled: checked, message: maintenanceMessage })}
              disabled={toggleMutation.isPending}
            />
          </div>
        ))}
      </div>

      {/* Maintenance Message */}
      <div className="space-y-2">
        <Label>Wartungsnachricht (wird Nutzern angezeigt)</Label>
        <Textarea
          value={maintenanceMessage}
          onChange={(e) => setMaintenanceMessage(e.target.value)}
          placeholder="z.B. Wartungsarbeiten bis ca. 14:00 Uhr..."
          rows={2}
        />
      </div>

      {/* Force Reload Button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full gap-2">
            <AlertTriangle className="h-4 w-4" />
            FORCE-RELOAD für alle Clients erzwingen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Force-Reload bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Alle verbundenen Clients werden sofort gezwungen, die App neu zu laden. 
              Service Worker werden deinstalliert und Caches geleert. Dies kann laufende Arbeit unterbrechen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => forceReloadMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Jetzt erzwingen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kill Switch - Lock Everything */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
            <ShieldAlert className="h-4 w-4" />
            {anyActive ? 'Alles entsperren' : 'ALLES SOFORT SPERREN'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {anyActive ? 'Alle Instanzen entsperren?' : 'Alle Instanzen sperren?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {anyActive 
                ? 'Alle Wartungsmodi werden deaktiviert. Die Plattform ist sofort wieder erreichbar.'
                : 'ALLE Instanzen (App, Landingpage, Demo) werden sofort gesperrt. Nur Mission Control bleibt erreichbar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                // Toggle all except mission_control
                const targets = INSTANCES.filter(i => i.key !== 'maintenance_mode_mission_control');
                targets.forEach(i => {
                  toggleMutation.mutate({ key: i.key, enabled: !anyActive, message: maintenanceMessage });
                });
              }}
              className={anyActive ? '' : 'bg-destructive hover:bg-destructive/90'}
            >
              {anyActive ? 'Alles entsperren' : 'Alles sperren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
