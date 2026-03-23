import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, ArrowLeft, User, Loader2, MessageSquare, Paperclip, X, FileText, Users, Stethoscope, Lock } from "lucide-react";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { ChatAttachment, getFileType, getFileEmoji } from "@/components/chat/ChatAttachment";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { ClientPrivateChat } from "@/components/client/chat/ClientPrivateChat";
import { ClientExpertenChat } from "@/components/client/chat/ClientExpertenChat";
import { ClientGruppenChat } from "@/components/client/chat/ClientGruppenChat";

export default function ClientChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("experten");

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="w-full shrink-0">
          <TabsTrigger value="privat" className="flex-1 gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Privat
          </TabsTrigger>
          <TabsTrigger value="experten" className="flex-1 gap-1.5 text-xs">
            <Stethoscope className="h-3.5 w-3.5" />
            Experten
          </TabsTrigger>
          <TabsTrigger value="gruppe" className="flex-1 gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Gruppe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="privat" className="flex-1 overflow-hidden mt-3">
          <ClientPrivateChat />
        </TabsContent>

        <TabsContent value="experten" className="flex-1 overflow-hidden mt-3">
          <ClientExpertenChat />
        </TabsContent>

        <TabsContent value="gruppe" className="flex-1 overflow-hidden mt-3">
          <ClientGruppenChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
