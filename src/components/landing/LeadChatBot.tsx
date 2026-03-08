import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { X, Send, Calendar, AlertTriangle, HelpCircle, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadChatBotProps {
  providerId: string;
  providerName: string;
  providerLogo: string | null;
  primaryColor: string;
}

type ChatStep = 'greeting' | 'type' | 'consent' | 'postal' | 'phone' | 'done';
type LeadType = 'termin' | 'notfall' | 'frage';

interface Message {
  id: string;
  type: 'bot' | 'user' | 'buttons';
  content: string;
  buttons?: { id: LeadType; label: string; icon: React.ReactNode }[];
}

export function LeadChatBot({ providerId, providerName, providerLogo, primaryColor }: LeadChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [step, setStep] = useState<ChatStep>('greeting');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [leadType, setLeadType] = useState<LeadType | null>(null);
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Show bubble after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBubble(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("Hi! 👋 Ich bin gerade am Pferd, aber schreib mir gern – ich melde mich so schnell wie möglich!");
      setTimeout(() => {
        addBotMessage("Worum geht es?", [
          { id: 'termin', label: 'Termin', icon: <Calendar className="h-4 w-4" /> },
          { id: 'notfall', label: 'Notfall', icon: <AlertTriangle className="h-4 w-4" /> },
          { id: 'frage', label: 'Frage', icon: <HelpCircle className="h-4 w-4" /> },
        ]);
        setStep('type');
      }, 800);
    }
  }, [isOpen]);

  const addBotMessage = (content: string, buttons?: { id: LeadType; label: string; icon: React.ReactNode }[]) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: buttons ? 'buttons' : 'bot',
      content,
      buttons,
    }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content,
    }]);
  };

  const handleTypeSelect = (type: LeadType) => {
    setLeadType(type);
    const labels = { termin: 'Termin', notfall: 'Notfall', frage: 'Frage' };
    addUserMessage(labels[type]);
    
    setTimeout(() => {
      if (type === 'notfall') {
        addBotMessage("Bei Notfällen erreichst du mich am schnellsten telefonisch. Hinterlasse mir trotzdem deine PLZ und Nummer – ich rufe zurück!");
      }
      addBotMessage("Alles klar. Wo steht das Pferd? (PLZ)");
      setStep('postal');
    }, 500);
  };

  const handlePostalSubmit = () => {
    const trimmed = inputValue.trim();
    // Validate: min 4, max 10 characters (matches DB constraint)
    if (!trimmed || trimmed.length < 4 || trimmed.length > 10) return;
    
    setPostalCode(trimmed);
    addUserMessage(trimmed);
    setInputValue('');
    
    setTimeout(() => {
      addBotMessage("Super! Unter welcher Nummer erreiche ich dich?");
      setStep('phone');
    }, 500);
  };

  const handlePhoneSubmit = async () => {
    const trimmed = inputValue.trim();
    // Validate: min 6, max 50 characters (matches DB constraint)
    if (!trimmed || trimmed.length < 6 || trimmed.length > 50) return;
    
    setPhone(inputValue);
    addUserMessage(inputValue);
    setInputValue('');
    setSaving(true);

    try {
      // Save lead to database
      const { error } = await supabase
        .from('leads')
        .insert({
          provider_id: providerId,
          lead_type: leadType,
          postal_code: postalCode,
          phone: inputValue,
          source: 'chatbot',
          status: 'neu',
        });

      if (error) throw error;

      // Create notification for provider
      await supabase
        .from('notifications')
        .insert({
          user_id: providerId,
          title: 'Neuer Lead über Webseite',
          message: `${leadType === 'termin' ? 'Terminanfrage' : leadType === 'notfall' ? 'Notfall' : 'Frage'} aus PLZ ${postalCode}`,
          type: 'lead',
        });

      setTimeout(() => {
        addBotMessage("Danke! 🙌 Ich melde mich schnellstmöglich bei dir. Bis bald!");
        setStep('done');
      }, 500);

    } catch (error: any) {
      toast({ 
        title: "Fehler", 
        description: "Konnte die Anfrage nicht speichern. Bitte versuche es erneut.",
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'postal') {
      handlePostalSubmit();
    } else if (step === 'phone') {
      handlePhoneSubmit();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setShowBubble(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-6 z-50">
        {/* Speech Bubble */}
        {showBubble && !isOpen && (
          <div 
            className="absolute bottom-16 right-0 bg-background border border-border rounded-2xl rounded-br-sm p-4 shadow-lg max-w-[240px] animate-fade-in cursor-pointer"
            onClick={handleOpen}
          >
            <p className="text-sm text-foreground">
              Hi! 👋 Ich bin gerade am Pferd. Wie kann ich helfen?
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowBubble(false); }}
              className="absolute -top-2 -right-2 bg-muted rounded-full p-1 hover:bg-muted/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={handleOpen}
          className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 overflow-hidden border-2 border-background"
          style={{ backgroundColor: primaryColor }}
        >
          {providerLogo ? (
            <img src={providerLogo} alt="" className="h-full w-full object-cover" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-36 right-6 z-50 w-[340px] max-w-[calc(100vw-48px)] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div 
            className="flex items-center gap-3 p-4 border-b border-border"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            {providerLogo ? (
              <img src={providerLogo} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-background" />
            ) : (
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {providerName.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-foreground text-sm">{providerName}</p>
              <p className="text-xs text-muted-foreground">Antwortet meist in 1 Std.</p>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-muted rounded-full">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-[300px] overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === 'bot' && (
                  <div className="flex gap-2">
                    <div 
                      className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {providerName.charAt(0)}
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%]">
                      <p className="text-sm text-foreground">{msg.content}</p>
                    </div>
                  </div>
                )}
                
                {msg.type === 'buttons' && (
                  <div className="flex gap-2 ml-8">
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%]">
                      <p className="text-sm text-foreground mb-3">{msg.content}</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.buttons?.map((btn) => (
                          <Button
                            key={btn.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleTypeSelect(btn.id)}
                            className="gap-1.5"
                            style={{ 
                              borderColor: primaryColor,
                              color: primaryColor,
                            }}
                          >
                            {btn.icon}
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {msg.type === 'user' && (
                  <div className="flex justify-end">
                    <div 
                      className="rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {step !== 'greeting' && step !== 'type' && step !== 'done' && (
            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={step === 'postal' ? 'PLZ eingeben...' : 'Telefonnummer...'}
                  type={step === 'postal' ? 'text' : 'tel'}
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={saving || !inputValue.trim()}
                  style={{ backgroundColor: primaryColor }}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="p-4 border-t border-border text-center">
              <Button variant="outline" onClick={handleClose} className="w-full">
                Schließen
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}