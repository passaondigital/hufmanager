import { ShieldCheck, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedConnectionBadgeProps {
  status: 'active' | 'pending' | 'rejected';
  size?: 'sm' | 'md';
}

export function VerifiedConnectionBadge({ status, size = 'md' }: VerifiedConnectionBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  if (status === 'active') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1 cursor-help">
              <ShieldCheck className={iconSize} />
              {size !== 'sm' && 'Verifiziert'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Verifizierte Verbindung - Vollständiger Datenzugriff</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (status === 'pending') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 cursor-help">
              <Clock className={iconSize} />
              {size !== 'sm' && 'Ausstehend'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Verbindungsanfrage wartet auf Bestätigung</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-muted-foreground gap-1 cursor-help">
            <XCircle className={iconSize} />
            {size !== 'sm' && 'Abgelehnt'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Verbindungsanfrage wurde abgelehnt</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}