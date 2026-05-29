import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, AlertTriangle, Check, Power, Globe, Eye, Shield, Smartphone, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CURRENT_APP_VERSION } from '@/lib/appVersion';

interface VersionSetting {
  key: string;
  value: string;
  is_forced: boolean;
  message: string | null;
  updated_at: string;
}

const INSTANCE_CONFIGS = [
  { versionKey: 'app_version_provider', maintenanceKey: 'maintenance_mode_app', label: 'App – Provider (#PID)', icon: Briefcase, description: 'Mindestversion für Hufbearbeiter' },
  { versionKey: 'app_version_client', maintenanceKey: 'maintenance_mode_app', label: 'App – Client (#KID)', icon: Smartphone, description: 'Mindestversion für Pferdebesitzer' },
  { versionKey: 'app_version_landingpage', maintenanceKey: 'maintenance_mode_landingpage', label: 'Landingpage', icon: Globe, description: 'www.hufiapp.de' },
  { versionKey: 'app_version_demo', maintenanceKey: 'maintenance_mode_demo', label: 'Demo-Zugänge', icon: Eye, description: 'Alle 4 Demo-Rollen' },
  { versionKey: 'app_version_mission_control', maintenanceKey: 'maintenance_mode_mission_control', label: 'Mission Control', icon: Shield, description: 'Admin-Bereich' },
];

export function InstanceVersionControl() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['all-version-settings'],
    queryFn: async () => {
      const keys = [...INSTANCE_CONFIGS.map(c => c.versionKey), ...INSTANCE_CONFIGS.map(c => c.maintenanceKey)];
      const uniqueKeys = [...new Set(keys)];
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', uniqueKeys);
      if (error) throw error;
      return data as VersionSetting[];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Current deployed version */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Check className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Deployte Code-Version</p>
          <p className="text-xs text-muted-foreground">Definiert in appVersion.ts</p>
        </div>
        <Badge variant="secondary" className="ml-auto font-mono text-base px-3">v{CURRENT_APP_VERSION}</Badge>
      </div>

      {/* Instance Cards */}
      {INSTANCE_CONFIGS.map((config) => (
        <InstanceCard
          key={config.versionKey}
          config={config}
          versionSetting={settings?.find(s => s.key === config.versionKey)}
          maintenanceSetting={settings?.find(s => s.key === config.maintenanceKey)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['all-version-settings'] })}
        />
      ))}
    </div>
  );
}

function InstanceCard({ config, versionSetting, maintenanceSetting, onSaved }: {
  config: typeof INSTANCE_CONFIGS[0];
  versionSetting?: VersionSetting;
  maintenanceSetting?: VersionSetting;
  onSaved: () => void;
}) {
  const Icon = config.icon;
  const [version, setVersion] = useState(versionSetting?.value || '1.0.0');
  const [isForced, setIsForced] = useState(versionSetting?.is_forced || false);
  const [message, setMessage] = useState(versionSetting?.message || '');
  const isInMaintenance = maintenanceSetting?.value === 'true';

  useEffect(() => {
    if (versionSetting) {
      setVersion(versionSetting.value);
      setIsForced(versionSetting.is_forced);
      setMessage(versionSetting.message || '');
    }
  }, [versionSetting]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: version, is_forced: isForced, message: message || null })
        .eq('key', config.versionKey);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success(`${config.label} Version gespeichert`);
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const hasChanges = version !== versionSetting?.value 
    || isForced !== versionSetting?.is_forced 
    || (message || null) !== (versionSetting?.message || null);

  return (
    <Card className={isInMaintenance ? 'border-destructive/30 opacity-75' : ''}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{config.label}</span>
            {isInMaintenance && <Badge variant="destructive" className="text-[10px]">WARTUNG</Badge>}
          </div>
          <Badge variant="outline" className="font-mono">v{version}</Badge>
        </div>

        <p className="text-xs text-muted-foreground">{config.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Mindestversion</Label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="font-mono h-8 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2 p-2 rounded border bg-muted/30 h-8">
              <AlertTriangle className={`h-3 w-3 ${isForced ? 'text-destructive' : 'text-muted-foreground'}`} />
              <Label className="text-xs cursor-pointer">Erzwungen</Label>
              <Switch checked={isForced} onCheckedChange={setIsForced} className="scale-75" />
            </div>
          </div>
        </div>

        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Update-Nachricht (optional)"
          className="h-8 text-sm"
        />

        <Button 
          size="sm" 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending || !hasChanges}
          className="w-full h-8 text-xs"
        >
          {saveMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Speichern
        </Button>

        {versionSetting?.updated_at && (
          <p className="text-[10px] text-muted-foreground text-center">
            Zuletzt: {new Date(versionSetting.updated_at).toLocaleString('de-DE')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
