import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, AlertTriangle, Check, Smartphone, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CURRENT_APP_VERSION } from '@/lib/appVersion';

interface VersionSetting {
  key: string;
  value: string;
  is_forced: boolean;
  message: string | null;
  updated_at: string;
}

export function VersionManager() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['app_version_provider', 'app_version_client']);
      
      if (error) throw error;
      return data as VersionSetting[];
    },
  });

  const providerSetting = settings?.find(s => s.key === 'app_version_provider');
  const clientSetting = settings?.find(s => s.key === 'app_version_client');

  const updateMutation = useMutation({
    mutationFn: async (setting: Partial<VersionSetting> & { key: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: setting.value,
          is_forced: setting.is_forced,
          message: setting.message,
        })
        .eq('key', setting.key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings-versions'] });
      toast({
        title: 'Gespeichert',
        description: 'Version wurde aktualisiert. Benutzer werden benachrichtigt.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Konnte Version nicht speichern.',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Deployed Version Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            Aktuell deployte Version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-lg font-mono px-3 py-1">
              v{CURRENT_APP_VERSION}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Diese Version ist im Code definiert (src/lib/appVersion.ts)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Provider Version Control */}
      <VersionCard
        icon={Briefcase}
        title="Provider Version (Profis)"
        description="Mindestversion für Hufbearbeiter (#pid)"
        setting={providerSetting}
        onSave={(updates) => updateMutation.mutate({ key: 'app_version_provider', ...updates })}
        isLoading={updateMutation.isPending}
      />

      {/* Client Version Control */}
      <VersionCard
        icon={Smartphone}
        title="Client Version (Kunden)"
        description="Mindestversion für Pferdebesitzer (#kid)"
        setting={clientSetting}
        onSave={(updates) => updateMutation.mutate({ key: 'app_version_client', ...updates })}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

interface VersionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  setting?: VersionSetting;
  onSave: (updates: { value: string; is_forced: boolean; message: string | null }) => void;
  isLoading: boolean;
}

function VersionCard({ icon: Icon, title, description, setting, onSave, isLoading }: VersionCardProps) {
  const [version, setVersion] = useState(setting?.value || '1.0.0');
  const [isForced, setIsForced] = useState(setting?.is_forced || false);
  const [message, setMessage] = useState(setting?.message || '');

  // Sync with external data
  useState(() => {
    if (setting) {
      setVersion(setting.value);
      setIsForced(setting.is_forced);
      setMessage(setting.message || '');
    }
  });

  const handleSave = () => {
    onSave({
      value: version,
      is_forced: isForced,
      message: message || null,
    });
  };

  const hasChanges = 
    version !== setting?.value ||
    isForced !== setting?.is_forced ||
    (message || null) !== (setting?.message || null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version Input */}
        <div className="space-y-2">
          <Label htmlFor={`version-${setting?.key}`}>Mindestversion</Label>
          <Input
            id={`version-${setting?.key}`}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="font-mono max-w-[150px]"
          />
          <p className="text-xs text-muted-foreground">
            Format: MAJOR.MINOR.PATCH (z.B. 1.2.3)
          </p>
        </div>

        {/* Forced Update Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className={isForced ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} />
              <Label htmlFor={`forced-${setting?.key}`} className="font-medium">
                Erzwungenes Update
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Wenn aktiv, wird die App blockiert bis der Nutzer aktualisiert
            </p>
          </div>
          <Switch
            id={`forced-${setting?.key}`}
            checked={isForced}
            onCheckedChange={setIsForced}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor={`message-${setting?.key}`}>Nachricht (optional)</Label>
          <Textarea
            id={`message-${setting?.key}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="z.B. Wichtiges Sicherheits-Update"
            rows={2}
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isLoading || !hasChanges}
          className="w-full"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Speichern
        </Button>

        {/* Last Updated */}
        {setting?.updated_at && (
          <p className="text-xs text-muted-foreground text-center">
            Zuletzt aktualisiert: {new Date(setting.updated_at).toLocaleString('de-DE')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
