import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Wifi, Database, Server, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type SystemStatus = 'operational' | 'degraded' | 'down' | 'checking';

interface SystemCheck {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: SystemStatus;
  description: string;
  latency?: number;
}

const statusConfig: Record<SystemStatus, { label: string; color: string; bgColor: string }> = {
  operational: { label: 'Betriebsbereit', color: 'text-emerald-600', bgColor: 'bg-emerald-500' },
  degraded: { label: 'Eingeschränkt', color: 'text-amber-600', bgColor: 'bg-amber-500' },
  down: { label: 'Ausfall', color: 'text-red-600', bgColor: 'bg-red-500' },
  checking: { label: 'Prüfe…', color: 'text-muted-foreground', bgColor: 'bg-muted-foreground' },
};

export default function StatusPage() {
  const [checks, setChecks] = useState<SystemCheck[]>([
    { name: 'App-Server', icon: Server, status: 'checking', description: 'Frontend und API' },
    { name: 'Datenbank', icon: Database, status: 'checking', description: 'Daten-Speicherung' },
    { name: 'Authentifizierung', icon: Shield, status: 'checking', description: 'Login und Sessions' },
    { name: 'Internet', icon: Wifi, status: 'checking', description: 'Deine Verbindung' },
  ]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runChecks = async () => {
    setIsChecking(true);
    const results: SystemCheck[] = [];

    // 1. Check internet
    const online = navigator.onLine;
    results.push({
      name: 'Internet',
      icon: Wifi,
      status: online ? 'operational' : 'down',
      description: online ? 'Deine Verbindung ist stabil' : 'Keine Internetverbindung',
    });

    // 2. Check Supabase API
    try {
      const start = performance.now();
      const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      const latency = Math.round(performance.now() - start);
      
      results.push({
        name: 'Datenbank',
        icon: Database,
        status: error ? 'degraded' : 'operational',
        description: error ? `Eingeschränkt: ${error.message}` : `Reaktionszeit: ${latency}ms`,
        latency,
      });
    } catch {
      results.push({
        name: 'Datenbank',
        icon: Database,
        status: 'down',
        description: 'Verbindung fehlgeschlagen',
      });
    }

    // 3. Check Auth
    try {
      const start = performance.now();
      const { error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);
      
      results.push({
        name: 'Authentifizierung',
        icon: Shield,
        status: error ? 'degraded' : 'operational',
        description: error ? 'Sitzung konnte nicht geprüft werden' : `OK (${latency}ms)`,
        latency,
      });
    } catch {
      results.push({
        name: 'Authentifizierung',
        icon: Shield,
        status: 'down',
        description: 'Auth-Service nicht erreichbar',
      });
    }

    // 4. App server (if we got this far, it's running)
    results.unshift({
      name: 'App-Server',
      icon: Server,
      status: 'operational',
      description: 'Frontend läuft normal',
    });

    setChecks(results);
    setLastCheck(new Date());
    setIsChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const overallStatus = checks.some((c) => c.status === 'down')
    ? 'down'
    : checks.some((c) => c.status === 'degraded')
    ? 'degraded'
    : checks.some((c) => c.status === 'checking')
    ? 'checking'
    : 'operational';

  const overall = statusConfig[overallStatus];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Overall Status */}
      <Card className={`border-2 ${overallStatus === 'operational' ? 'border-emerald-200 dark:border-emerald-900' : overallStatus === 'down' ? 'border-red-200 dark:border-red-900' : 'border-amber-200 dark:border-amber-900'}`}>
        <CardContent className="p-8 text-center space-y-4">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${overallStatus === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/30' : overallStatus === 'down' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            {overallStatus === 'operational' ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            ) : overallStatus === 'down' ? (
              <XCircle className="h-10 w-10 text-red-600" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-amber-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {overallStatus === 'operational'
                ? 'Alle Systeme laufen'
                : overallStatus === 'down'
                ? 'Systemstörung erkannt'
                : 'Eingeschränkter Betrieb'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {overallStatus === 'operational'
                ? 'HufManager funktioniert einwandfrei.'
                : 'Wir arbeiten daran, das Problem zu beheben.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Individual checks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">System-Komponenten</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={runChecks}
            disabled={isChecking}
            className="gap-1.5 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            Erneut prüfen
          </Button>
        </div>

        {checks.map((check) => {
          const config = statusConfig[check.status];
          return (
            <Card key={check.name}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${check.status === 'operational' ? 'bg-emerald-100 dark:bg-emerald-900/30' : check.status === 'down' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  <check.icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${config.bgColor}`} />
                  <Badge variant="outline" className={`text-xs ${config.color}`}>
                    {config.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Last check timestamp */}
      {lastCheck && (
        <p className="text-center text-xs text-muted-foreground">
          Zuletzt geprüft: {lastCheck.toLocaleTimeString('de-DE')}
        </p>
      )}

      {/* Help text */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Wenn ein Problem länger als 5 Minuten anhält, kontaktiere unseren Support 
            oder frag Hufi (✨ unten rechts).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
