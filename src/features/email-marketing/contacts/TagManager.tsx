import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface TagManagerProps {
  subscriberId: string;
  tags: string[];
}

export function TagManager({ subscriberId, tags }: TagManagerProps) {
  const [newTag, setNewTag] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const addTag = async () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    const updated = [...tags, tag];
    const { error } = await supabase
      .from("email_subscribers")
      .update({ tags: updated })
      .eq("id", subscriberId);
    if (error) return toast.error("Fehler beim Tag hinzufügen");
    queryClient.invalidateQueries({ queryKey: ["email-subscribers"] });
    setNewTag("");
  };

  const removeTag = async (tag: string) => {
    const updated = tags.filter(t => t !== tag);
    const { error } = await supabase
      .from("email_subscribers")
      .update({ tags: updated })
      .eq("id", subscriberId);
    if (error) return toast.error("Fehler beim Tag entfernen");
    queryClient.invalidateQueries({ queryKey: ["email-subscribers"] });
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map(tag => (
        <Badge key={tag} variant="outline" className="text-xs gap-1 py-0 h-5 bg-orange-50 text-orange-700 border-orange-200">
          {tag}
          <X className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} />
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Plus className="w-3 h-3 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="flex gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Tag..."
              className="h-7 text-xs bg-white"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            />
            <Button size="icon" className="h-7 w-7 bg-[#F47B20] hover:bg-[#e06a10] shrink-0" onClick={addTag}>
              <Plus className="w-3 h-3 text-white" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
