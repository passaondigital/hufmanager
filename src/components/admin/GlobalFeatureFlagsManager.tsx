import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { FeatureStatusSelect } from "@/components/admin/FeatureStatusSelect";
import { FEATURE_DEFINITIONS, FeatureStatus, FeatureKey } from "@/types/featureFlags";

interface GlobalDefault {
  id: string;
  feature_key: string;
  feature_name: string;
  default_status: FeatureStatus;
  description: string | null;
}

export function GlobalFeatureFlagsManager() {
  const [defaults, setDefaults] = useState<GlobalDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, FeatureStatus>>({});

  useEffect(() => {
    fetchDefaults();
  }, []);

  const fetchDefaults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("global_feature_defaults")
        .select("*")
        .order("feature_name");

      if (error) throw error;
      setDefaults(data || []);
      setPendingChanges({});
    } catch (error) {
      console.error("Error fetching global defaults:", error);
      toast.error("Fehler beim Laden der globalen Einstellungen");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (featureKey: string, status: FeatureStatus) => {
    setPendingChanges(prev => ({
      ...prev,
      [featureKey]: status
    }));
  };

  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setSaving(true);
    try {
      for (const [featureKey, status] of Object.entries(pendingChanges)) {
        const { error } = await supabase
          .from("global_feature_defaults")
          .update({ default_status: status })
          .eq("feature_key", featureKey);

        if (error) throw error;
      }

      toast.success("Globale Einstellungen gespeichert");
      await fetchDefaults();
    } catch (error) {
      console.error("Error saving global defaults:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Globale Feature-Einstellungen</CardTitle>
          <CardDescription>
            Standardstatus für neue Provider. Änderungen wirken sich nur auf neue Accounts aus.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchDefaults} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {hasChanges && (
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Speichern
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {defaults.map((item) => {
            const currentStatus = pendingChanges[item.feature_key] || item.default_status;
            const hasLocalChange = item.feature_key in pendingChanges;
            
            return (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  hasLocalChange ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium">{item.feature_name}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <FeatureStatusSelect
                  value={currentStatus}
                  onValueChange={(status) => handleStatusChange(item.feature_key, status)}
                  disabled={saving}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
