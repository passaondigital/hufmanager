import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CURRENT_APP_VERSION, forceHardReload, compareVersions } from '@/lib/appVersion';
import { cn } from '@/lib/utils';

interface VersionInfo {
  version: string;
  isForced: boolean;
  message: string | null;
}

// Check interval: 2 minutes
const CHECK_INTERVAL_MS = 2 * 60 * 1000;

export function VersionChecker() {
  const { role, user } = useAuth();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isForced, setIsForced] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkVersion = useCallback(async () => {
    if (!user) return;

    try {
      // Determine which version to check based on role
      const versionKey = role === 'client' ? 'app_version_client' : 'app_version_provider';
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, is_forced, message')
        .eq('key', versionKey)
        .single();

      if (error) {
        console.error('[VersionChecker] Error fetching version:', error);
        return;
      }

      if (data) {
        const serverVersion = data.value;
        const comparison = compareVersions(CURRENT_APP_VERSION, serverVersion);
        
        // If local version is older than server version
        if (comparison < 0) {
          console.log(`[VersionChecker] Update available: ${CURRENT_APP_VERSION} -> ${serverVersion}`);
          setUpdateAvailable(true);
          setRemoteVersion(serverVersion);
          setIsForced(data.is_forced);
          setMessage(data.message);
          
          // If forced, can't dismiss
          if (data.is_forced) {
            setDismissed(false);
          }
        } else {
          // Version is current or newer
          setUpdateAvailable(false);
          setIsForced(false);
          setMessage(null);
          setRemoteVersion(null);
        }
      }
    } catch (error) {
      console.error('[VersionChecker] Unexpected error:', error);
    }
  }, [user, role]);

  // Initial check and interval
  useEffect(() => {
    // Initial check after a short delay (let auth settle)
    const initialTimeout = setTimeout(checkVersion, 2000);
    
    // Periodic checks
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkVersion]);

  // Also check when user changes (login/logout)
  useEffect(() => {
    if (user) {
      checkVersion();
    }
  }, [user, checkVersion]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    await forceHardReload();
  };

  const handleDismiss = () => {
    if (!isForced) {
      setDismissed(true);
    }
  };

  // Don't show anything if no update or dismissed (and not forced)
  if (!updateAvailable || (dismissed && !isForced)) {
    return null;
  }

  // FORCED UPDATE - Full screen blocking modal
  if (isForced) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
        <div className="w-full max-w-md text-center">
          {/* Animated Icon */}
          <div className="relative mx-auto w-24 h-24 mb-8">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-primary rounded-full flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>

          {/* Content */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Update erforderlich
          </h1>
          
          <p className="text-muted-foreground mb-2">
            {message || 'Wir haben die App verbessert. Bitte aktualisiere auf die neueste Version.'}
          </p>
          
          <p className="text-sm text-muted-foreground/70 mb-8">
            Version {CURRENT_APP_VERSION} → {remoteVersion}
          </p>

          {/* Big Orange Button */}
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                Wird aktualisiert...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Update laden
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground/50 mt-4">
            Die App wird neu geladen und der Cache geleert.
          </p>
        </div>
      </div>
    );
  }

  // SOFT UPDATE - Bottom banner/toast
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-2xl shadow-primary/10 flex items-center gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              Neue Version verfügbar!
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {message || `v${remoteVersion} ist bereit`}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDismiss}
              className="h-8 text-xs text-muted-foreground"
            >
              Später
            </Button>
            <Button 
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3"
            >
              {isUpdating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Update
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
