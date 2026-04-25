import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageSquare, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string;
  userId: string;
  lastMessage?: string;
  lastTime?: string;
}

// Demo contacts for now
const DEMO_CONTACTS: Contact[] = [
  { id: "demo-1", name: "Demo-Reitfreundin Anna", userId: "demo-user-1", lastMessage: "Reitest du morgen auch?", lastTime: "14:22" },
  { id: "demo-2", name: "Demo-Stallnachbar Max", userId: "demo-user-2", lastMessage: "Kannst du heute nach meinem Pferd schauen?", lastTime: "Gestern" },
  { id: "demo-3", name: "Demo-Reitbeteiligung Lisa", userId: "demo-user-3", lastMessage: "Ich bringe das Putzzeug mit!", lastTime: "Mo" },
];

const DEMO_MESSAGES = [
  { id: "m1", senderId: "demo-user-1", content: "Hey! Reitest du morgen auch?", time: "14:22", isDemo: true },
  { id: "m2", senderId: "self", content: "Ja, bin ab 15 Uhr da 🐴", time: "14:25", isDemo: true },
  { id: "m3", senderId: "demo-user-1", content: "Super, dann sehen wir uns auf der Halle!", time: "14:26", isDemo: true },
];

export function ClientPrivateChat() {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [message, setMessage] = useState("");

  // Contact list
  if (!selectedContact) {
    return (
      <div className="flex flex-col h-full">
        <div className="pb-3 border-b border-border mb-3">
          <p className="text-sm font-semibold">Privat-Chat</p>
          <p className="text-xs text-muted-foreground">Chat mit Reitfreunden & Pferdebesitzern</p>
        </div>

        {DEMO_CONTACTS.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Keine Kontakte</p>
            <p className="text-xs">Verbinde dich über Hufi Connect mit anderen Pferdebesitzern.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {DEMO_CONTACTS.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{contact.lastTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Demo</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedContact(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {selectedContact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{selectedContact.name}</p>
          <p className="text-xs text-muted-foreground">Pferdebesitzer</p>
        </div>
        <Badge variant="outline" className="text-[10px]">Demo</Badge>
      </div>

      <ScrollArea className="flex-1 py-2">
        <div className="space-y-3">
          {DEMO_MESSAGES.map((msg) => {
            const isMe = msg.senderId === "self";
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>{msg.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <form onSubmit={(e) => { e.preventDefault(); setMessage(""); }} className="flex items-center gap-2 pt-3 border-t border-border">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nachricht schreiben..." className="flex-1" />
        <Button type="submit" size="icon" disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
