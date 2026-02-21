import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, CheckCircle, AlertTriangle, RotateCcw, Loader2, FileText, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const INSTANCES = [
  { value: 'app', label: 'App' },
  { value: 'landingpage', label: 'Landingpage' },
  { value: 'demo', label: 'Demo' },
  { value: 'mission_control', label: 'Mission Control' },
];

const STATUS_CONFIG = {
  draft: { label: 'Entwurf', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_review: { label: 'Prüfung', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  approved: { label: 'Freigegeben', color: 'bg-primary/10 text-primary', icon: CheckCircle },
  deployed: { label: 'Deployed', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  rolled_back: { label: 'Zurückgerollt', color: 'bg-destructive/10 text-destructive', icon: RotateCcw },
};

const RELEASE_TYPES = [
  { value: 'hotfix', label: '🔥 Hotfix', description: 'Kritische Fehlerbehebung' },
  { value: 'patch', label: '🩹 Patch', description: 'Kleine Fehlerbehebung' },
  { value: 'minor', label: '✨ Minor', description: 'Neue Features' },
  { value: 'major', label: '🚀 Major', description: 'Große Änderungen' },
];

interface Release {
  id: string;
  version: string;
  instance: string;
  status: string;
  release_type: string;
  changelog: string | null;
  breaking_changes: string | null;
  rollback_notes: string | null;
  deployed_at: string | null;
  approved_at: string | null;
  rolled_back_at: string | null;
  created_at: string;
}

export function ReleaseHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterInstance, setFilterInstance] = useState<string>('all');
  const [newRelease, setNewRelease] = useState({
    version: '',
    instance: 'app',
    release_type: 'patch',
    changelog: '',
    breaking_changes: '',
    rollback_notes: '',
  });

  const { data: releases, isLoading } = useQuery({
    queryKey: ['release-history', filterInstance],
    queryFn: async () => {
      let query = supabase
        .from('release_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (filterInstance !== 'all') {
        query = query.eq('instance', filterInstance);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Release[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('release_history').insert({
        version: newRelease.version,
        instance: newRelease.instance,
        release_type: newRelease.release_type,
        changelog: newRelease.changelog || null,
        breaking_changes: newRelease.breaking_changes || null,
        rollback_notes: newRelease.rollback_notes || null,
        status: 'pending_review',
        deployed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-history'] });
      setDialogOpen(false);
      setNewRelease({ version: '', instance: 'app', release_type: 'patch', changelog: '', breaking_changes: '', rollback_notes: '' });
      toast.success('Release erstellt – wartet auf Prüfung');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      if (status === 'deployed') {
        updates.deployed_at = new Date().toISOString();
      }
      if (status === 'rolled_back') {
        updates.rolled_back_at = new Date().toISOString();
      }

      const { error } = await supabase.from('release_history').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-history'] });
      toast.success('Status aktualisiert');
    },
  });

  return (
    <div className="space-y-4">
      {/* Header with filter & create */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={filterInstance} onValueChange={setFilterInstance}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Instanzen</SelectItem>
            {INSTANCES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Neues Release
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Neues Release erstellen
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    value={newRelease.version}
                    onChange={(e) => setNewRelease(p => ({ ...p, version: e.target.value }))}
                    placeholder="1.2.0"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instanz</Label>
                  <Select value={newRelease.instance} onValueChange={(v) => setNewRelease(p => ({ ...p, instance: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INSTANCES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Release-Typ</Label>
                <Select value={newRelease.release_type} onValueChange={(v) => setNewRelease(p => ({ ...p, release_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELEASE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label} – {t.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Changelog / Release Notes</Label>
                <Textarea
                  value={newRelease.changelog}
                  onChange={(e) => setNewRelease(p => ({ ...p, changelog: e.target.value }))}
                  placeholder="- Feature X hinzugefügt&#10;- Bug Y behoben&#10;- Performance verbessert"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Breaking Changes (optional)</Label>
                <Textarea
                  value={newRelease.breaking_changes}
                  onChange={(e) => setNewRelease(p => ({ ...p, breaking_changes: e.target.value }))}
                  placeholder="z.B. API-Änderungen, DB-Schema-Änderungen..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Rollback-Hinweise (optional)</Label>
                <Textarea
                  value={newRelease.rollback_notes}
                  onChange={(e) => setNewRelease(p => ({ ...p, rollback_notes: e.target.value }))}
                  placeholder="Was muss beachtet werden bei Rollback..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!newRelease.version || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Zur Prüfung einreichen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Release Timeline */}
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !releases?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Releases erstellt.</CardContent></Card>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {releases.map((release) => {
              const statusCfg = STATUS_CONFIG[release.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              const StatusIcon = statusCfg.icon;
              const typeCfg = RELEASE_TYPES.find(t => t.value === release.release_type);

              return (
                <Card key={release.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-sm">v{release.version}</Badge>
                          <Badge className={statusCfg.color + ' border-0'}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="secondary">{INSTANCES.find(i => i.value === release.instance)?.label}</Badge>
                          {typeCfg && <span className="text-xs">{typeCfg.label}</span>}
                        </div>

                        {release.changelog && (
                          <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                            {release.changelog}
                          </pre>
                        )}

                        {release.breaking_changes && (
                          <div className="mt-2 p-2 rounded bg-destructive/5 border border-destructive/20">
                            <p className="text-xs font-medium text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Breaking Changes
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{release.breaking_changes}</p>
                          </div>
                        )}

                        <p className="text-[11px] text-muted-foreground mt-2">
                          Erstellt: {format(new Date(release.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          {release.deployed_at && ` · Deployed: ${format(new Date(release.deployed_at), 'dd.MM.yyyy HH:mm', { locale: de })}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5">
                        {release.status === 'pending_review' && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: release.id, status: 'approved' })}>
                            ✅ Freigeben
                          </Button>
                        )}
                        {release.status === 'approved' && (
                          <Button size="sm" className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: release.id, status: 'deployed' })}>
                            🚀 Deploy
                          </Button>
                        )}
                        {release.status === 'deployed' && (
                          <Button size="sm" variant="destructive" className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: release.id, status: 'rolled_back' })}>
                            ↩️ Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
