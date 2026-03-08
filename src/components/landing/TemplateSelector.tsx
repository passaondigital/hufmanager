import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TemplateOption {
  id: string;
  label: string;
  description: string;
  preview: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Bewährt & professionell",
    preview: "🏛️",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Groß & visuell",
    preview: "🎨",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Schlicht & schnell",
    preview: "✨",
  },
];

interface TemplateSelectorProps {
  value: string;
  onChange: (template: string) => void;
  primaryColor: string;
}

export function TemplateSelector({ value, onChange, primaryColor }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATES.map((t) => (
        <Card
          key={t.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            value === t.id && "ring-2 shadow-md"
          )}
          style={value === t.id ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}40` } : undefined}
          onClick={() => onChange(t.id)}
        >
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-2">{t.preview}</div>
            <p className="font-semibold text-sm text-foreground">{t.label}</p>
            <p className="text-xs text-muted-foreground">{t.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
