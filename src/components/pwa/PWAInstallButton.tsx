import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

interface PWAInstallButtonProps {
  className?: string;
  collapsed?: boolean;
}

export function PWAInstallButton({ className, collapsed = false }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isMacSafari, promptInstall } = usePWAInstall();

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Mac Safari hint
  if (isMacSafari) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent gap-3 justify-start",
              collapsed ? "w-12 h-12 p-0 justify-center" : "w-full px-4 py-3",
              className
            )}
          >
            <Share className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-[15px]">Zum Dock hinzufügen</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[250px]">
          <p className="text-sm">
            <strong>Tipp:</strong> Klicke auf Teilen → Zum Dock hinzufügen, um HufManager als App zu nutzen
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Native install prompt available
  if (canInstall) {
    return (
      <Button
        variant="ghost"
        onClick={promptInstall}
        className={cn(
          "text-primary hover:text-primary hover:bg-primary/10 gap-3 justify-start",
          collapsed ? "w-12 h-12 p-0 justify-center" : "w-full px-4 py-3",
          className
        )}
      >
        <Download className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium text-[15px]">Als Programm installieren</span>}
      </Button>
    );
  }

  return null;
}
