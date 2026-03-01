import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  /** What belongs in this field */
  text: string;
  /** Example value */
  example?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Kontextuelle Hilfe für Formularfelder.
 * Zeigt ℹ️ Icon — Klick/Hover erklärt was ins Feld gehört + Beispiel.
 */
export function InfoTooltip({ text, example, className }: InfoTooltipProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            className
          )}
          aria-label="Hilfe"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs text-left space-y-1.5 p-3"
      >
        <p className="text-sm text-foreground">{text}</p>
        {example && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Beispiel:</span> {example}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
