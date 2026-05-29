import { useState } from "react";
import { ArrowLeft, BookOpen, Presentation, Copy, Check, Sparkles } from "lucide-react";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  role_access: "all" | "pid_only" | "kid_only";
  tags: string[];
  hook: string | null;
  solution_steps: string[] | null;
  call_to_action: string | null;
  is_featured: boolean;
}

interface HelpArticleViewProps {
  article: HelpArticle;
  onBack: () => void;
  isAdmin: boolean;
}

export function HelpArticleView({ article, onBack, isAdmin }: HelpArticleViewProps) {
  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateScript = () => {
    const steps = article.solution_steps?.join(", ") || article.content.slice(0, 200);
    return `Hey Leute, heute zeige ich euch: ${article.title}.\n\nKennt ihr das Problem? ${article.hook || "Viele kennen das..."}\n\nMit Hufi geht das so: ${steps}\n\nCool, oder? ${article.call_to_action || "Probier es jetzt aus!"}`;
  };

  const copyAsSlide = async () => {
    const slideText = `
📌 ${article.title}

🎯 HOOK:
${article.hook || "(Kein Hook definiert)"}

📋 LÖSUNG:
${article.solution_steps?.map((s, i) => `${i + 1}. ${s}`).join("\n") || "(Keine Schritte definiert)"}

👉 CTA:
${article.call_to_action || "(Kein CTA definiert)"}
`.trim();

    try {
      await navigator.clipboard.writeText(slideText);
      setCopied(true);
      toast.success("Als Folie kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  // Presenter Mode
  if (isPresenterMode) {
    return (
      <div className="bg-black text-white min-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="presenter-mode"
                checked={isPresenterMode}
                onCheckedChange={setIsPresenterMode}
              />
              <Label htmlFor="presenter-mode" className="text-white text-sm">
                Präsentieren
              </Label>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Title */}
            <h1 className="text-4xl font-bold text-center mb-8">
              {article.title}
            </h1>

            {/* Hook Card */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <p className="text-sm uppercase tracking-wide text-white/60 mb-2">
                🎯 Der Hook
              </p>
              <p className="text-2xl font-medium leading-relaxed">
                {article.hook || "Kein Hook definiert"}
              </p>
            </div>

            {/* Solution Card */}
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <p className="text-sm uppercase tracking-wide text-white/60 mb-4">
                📋 Die Lösung
              </p>
              <div className="space-y-4">
                {article.solution_steps?.length ? (
                  article.solution_steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xl font-bold">
                        {index + 1}
                      </span>
                      <p className="text-xl pt-1.5">{step}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-lg text-white/60">Keine Schritte definiert</p>
                )}
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-primary/20 rounded-xl p-6 border border-primary/40">
              <p className="text-sm uppercase tracking-wide text-white/60 mb-2">
                👉 Call-to-Action
              </p>
              <p className="text-2xl font-medium leading-relaxed">
                {article.call_to_action || "Kein CTA definiert"}
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/20 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={copyAsSlide}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Als Folie kopieren
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(generateScript());
              toast.success("Skript kopiert!");
            }}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Skript generieren
          </Button>
        </div>
      </div>
    );
  }

  // Normal Reading Mode
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        
        {isAdmin && (
          <div className="flex items-center gap-2">
            <BookOpen className={cn("h-4 w-4", !isPresenterMode && "text-primary")} />
            <Switch
              id="presenter-mode"
              checked={isPresenterMode}
              onCheckedChange={setIsPresenterMode}
            />
            <Presentation className={cn("h-4 w-4", isPresenterMode && "text-primary")} />
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <h1 className="text-2xl font-bold mb-4">{article.title}</h1>
          
          {/* Render markdown-ish content */}
          <div className="space-y-4">
            {article.content.split("\n\n").map((paragraph, index) => {
              // Headers
              if (paragraph.startsWith("## ")) {
                return (
                  <h2 key={index} className="text-lg font-semibold mt-6 mb-2">
                    {paragraph.replace("## ", "")}
                  </h2>
                );
              }
              
              // Lists
              if (paragraph.includes("\n- ") || paragraph.startsWith("- ")) {
                const items = paragraph.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("  - "));
                return (
                  <ul key={index} className="list-disc list-inside space-y-1">
                    {items.map((item, i) => (
                      <li key={i} className={cn(item.startsWith("  - ") && "ml-4")}>
                        {item.replace(/^-\s+/, "").replace(/^\s+-\s+/, "")}
                      </li>
                    ))}
                  </ul>
                );
              }

              // Numbered lists
              if (/^\d+\.\s/.test(paragraph)) {
                const items = paragraph.split("\n").filter((l) => /^\d+\.\s/.test(l));
                return (
                  <ol key={index} className="list-decimal list-inside space-y-1">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^\d+\.\s+/, "")}</li>
                    ))}
                  </ol>
                );
              }

              // Bold text
              const formattedText = paragraph.replace(
                /\*\*(.+?)\*\*/g,
                '<strong class="font-semibold">$1</strong>'
              );
              const sanitized = DOMPurify.sanitize(formattedText, {
                ALLOWED_TAGS: ['strong', 'em', 'b', 'i'],
                ALLOWED_ATTR: ['class'],
              });

              return (
                <p
                  key={index}
                  dangerouslySetInnerHTML={{ __html: sanitized }}
                />
              );
            })}
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Verwandte Themen:</p>
              <div className="flex flex-wrap gap-1">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </ScrollArea>
    </div>
  );
}
