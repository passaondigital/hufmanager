import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Download, Upload, Loader2, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Snapshot {
  id: string;
  name: string;
  description: string | null;
  snapshot_data: Record<string, unknown>;
  snapshot_type: string;
  created_at: string;
}

export function ConfigSnapshots() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [snapshotName, setSnapshotName] = useState('');

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['config-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Snapshot[];
    },
  });

  const createSnapshotMutation = useMutation({
    mutationFn: async () => {
      // Collect all system_settings
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');
      if (settingsError) throw settingsError;

      const snapshotData = {
        system_settings: settings,
        timestamp: new Date().toISOString(),
        app_version: (await import('@/lib/appVersion')).CURRENT_APP_VERSION,
      };

      const { error } = await supabase.from('config_snapshots').insert({
        name: snapshotName || `Snapshot ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
        snapshot_data: snapshotData,
        snapshot_type: 'manual',
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-snapshots'] });
      setSnapshotName('');
      toast.success('Config-Snapshot erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const restoreMutation = useMutation({
    mutationFn: async (snapshot: Snapshot) => {
      const settings = (snapshot.snapshot_data as any)?.system_settings;
      if (!settings || !Array.isArray(settings)) throw new Error('Ungültiger Snapshot');

      for (const setting of settings) {
        await supabase
          .from('system_settings')
          .update({ value: setting.value, is_forced: setting.is_forced, message: setting.message })
          .eq('key', setting.key);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-version-settings', 'maintenance-settings'] });
      toast.success('Config wiederhergestellt');
    },
    onError: () => toast.error('Fehler beim Wiederherstellen'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('config_snapshots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-snapshots'] });
      toast.success('Snapshot gelöscht');
    },
  });

  return (
    <div className="space-y-4">
      {/* Create Snapshot */}
      <div className="flex gap-2">
        <Input
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          placeholder="Snapshot-Name (optional)"
          className="flex-1"
        />
        <Button 
          onClick={() => createSnapshotMutation.mutate()} 
          disabled={createSnapshotMutation.isPending}
          className="gap-2"
        >
          {createSnapshotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Snapshot erstellen
        </Button>
      </div>

      {/* Snapshot List */}
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !snapshots?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Snapshots erstellt.</CardContent></Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {snapshots.map((snapshot) => (
              <Card key={snapshot.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{snapshot.name}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {snapshot.snapshot_type === 'pre_release' ? 'Pre-Release' : 'Manuell'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(snapshot.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      {' · '}
                      {Object.keys((snapshot.snapshot_data as any)?.system_settings || {}).length} Einstellungen
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <Upload className="h-3 w-3" /> Restore
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Snapshot wiederherstellen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Alle aktuellen system_settings werden mit den Werten aus "{snapshot.name}" überschrieben.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => restoreMutation.mutate(snapshot)}>
                            Wiederherstellen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      onClick={() => deleteMutation.mutate(snapshot.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Export Button */}
      <Button variant="outline" className="w-full gap-2" onClick={() => {
        if (!snapshots?.length) return;
        const blob = new Blob([JSON.stringify(snapshots[0].snapshot_data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hufmanager-config-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }}>
        <Download className="h-4 w-4" />
        Letzten Snapshot als JSON exportieren
      </Button>
    </div>
  );
}
