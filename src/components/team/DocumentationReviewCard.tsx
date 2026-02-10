import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, FileText, Image, Film } from "lucide-react";
import { useApproveDocumentation, useRejectDocumentation } from "@/hooks/useDocumentation";
import type { DocumentationItem } from "@/types/team";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const TYPE_ICONS = {
  photo: Image,
  note: FileText,
  video: Film,
};

const TYPE_LABELS = {
  photo: "Foto",
  note: "Notiz",
  video: "Video",
};

interface DocumentationReviewCardProps {
  item: DocumentationItem;
}

export function DocumentationReviewCard({ item }: DocumentationReviewCardProps) {
  const [feedback, setFeedback] = useState("");
  const approve = useApproveDocumentation();
  const reject = useRejectDocumentation();

  const Icon = TYPE_ICONS[item.item_type];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="gap-1">
                <Icon className="h-3 w-3" />
                {TYPE_LABELS[item.item_type]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(item.created_at), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}
              </span>
              {item.employee && (
                <span className="text-xs text-muted-foreground">
                  von {item.employee.full_name}
                </span>
              )}
            </div>

            {/* Content */}
            {item.item_type === "photo" && item.content ? (
              <div className="mb-3">
                <img
                  src={item.content}
                  alt="Dokumentation"
                  className="rounded-lg border max-h-64 object-cover"
                />
              </div>
            ) : item.item_type === "note" ? (
              <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">
                {item.content}
              </p>
            ) : null}

            {/* Feedback input */}
            <Input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="R\u00fcckmeldung (optional)"
              className="mb-3"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  approve.mutate({
                    id: item.id,
                    providerNotes: feedback.trim() || undefined,
                  })
                }
                disabled={approve.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Freigeben
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  reject.mutate({
                    id: item.id,
                    providerNotes: feedback.trim() || undefined,
                  })
                }
                disabled={reject.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Ablehnen
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
