import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export function ShareInviteLinkCard() {
  const { user } = useAuth();
  const [readableId, setReadableId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReadableId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('readable_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data?.readable_id) {
        setReadableId(data.readable_id);
      }
    };
    
    fetchReadableId();
  }, [user]);

  const inviteUrl = readableId 
    ? `${window.location.origin}/auth?invite_code=${readableId}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: 'Link kopiert!', description: 'Du kannst ihn jetzt teilen.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ 
        title: 'Kopieren fehlgeschlagen', 
        variant: 'destructive' 
      });
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HufManager Einladung',
          text: 'Registriere dich bei HufManager und verbinde dich direkt mit mir!',
          url: inviteUrl,
        });
      } catch (error: any) {
        // User cancelled share
        if (error.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  if (!readableId) return null;

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <LinkIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">
              Kunden einladen
            </p>
            <p className="text-xs text-muted-foreground">
              Neue Kunden werden automatisch mit dir verbunden
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Input 
            value={inviteUrl || ''} 
            readOnly 
            className="flex-1 text-xs bg-background"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button 
            size="icon" 
            onClick={handleShare}
            className="shrink-0"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
