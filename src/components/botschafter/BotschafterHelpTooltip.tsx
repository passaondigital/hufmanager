import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

interface Props {
  title: string;
  content: string;
  learnMoreUrl?: string;
}

export function BotschafterHelpTooltip({ title, content, learnMoreUrl }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors ml-1">
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" side="top" align="start">
        <p className="font-semibold text-sm mb-1">{title}</p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{content}</p>
        {learnMoreUrl && (
          <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-orange-500 hover:underline mt-1.5 inline-block">
            Mehr erfahren →
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
