import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfettiEffect } from './ConfettiEffect';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface SetupCompleteScreenProps {
  displayName: string;
  horseName?: string;
  clientName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  clientId?: string;
  onContinue: () => void;
}

export function SetupCompleteScreen({
  displayName,
  horseName,
  clientName,
  appointmentDate,
  appointmentTime,
  clientId,
  onContinue,
}: SetupCompleteScreenProps) {
  const hasData = horseName || clientName || appointmentDate;

  const handleWhatsAppInvite = () => {
    const providerName = displayName;
    const horseText = horseName ? ` für ${horseName}` : '';
    const message = `Hallo${clientName ? ` ${clientName.split(' ')[0]}` : ''}! 🐴\n\nIch nutze jetzt den Hufi${horseText}. Damit hast du alle Infos zu deinem Pferd direkt auf dem Handy – Termine, Befunde und mehr.\n\nHier ist dein Zugang:\nhttps://hufiapp.de\n\nViele Grüße,\n${providerName}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const formattedDate = appointmentDate
    ? format(parseISO(appointmentDate), 'EEEE, dd. MMMM', { locale: de })
    : null;

  return (
    <>
      <ConfettiEffect />
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="w-full max-w-md text-center space-y-6"
        >
          {/* Trophy icon */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center"
          >
            <span className="text-6xl">✅</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-bold text-foreground">
              Du bist startklar!
            </h1>
            {hasData ? (
              <div className="bg-muted/30 rounded-xl p-4 text-left space-y-3 mt-4">
                {horseName && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🐴</span>
                    <div>
                      <p className="font-medium text-foreground">{horseName}</p>
                      {clientName && <p className="text-sm text-muted-foreground">Besitzer: {clientName}</p>}
                    </div>
                  </div>
                )}
                {appointmentDate && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="font-medium text-foreground">Nächster Termin</p>
                      <p className="text-sm text-muted-foreground">
                        {formattedDate}{appointmentTime ? ` um ${appointmentTime} Uhr` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">
                Dein Hufi ist eingerichtet und bereit.
              </p>
            )}
          </motion.div>

          {/* WhatsApp CTA */}
          {clientName && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                size="lg"
                onClick={handleWhatsAppInvite}
                className="gap-2 h-14 px-6 text-base font-semibold w-full bg-[#25D366] hover:bg-[#1DA851] text-white"
              >
                <MessageCircle className="h-5 w-5" />
                {clientName.split(' ')[0]} zur App einladen
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Öffnet WhatsApp mit fertigem Einladungstext
              </p>
            </motion.div>
          )}

          {/* Dashboard CTA */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: clientName ? 0.9 : 0.7 }}
          >
            <Button
              size="lg"
              onClick={onContinue}
              variant={clientName ? 'outline' : 'default'}
              className={`gap-2 h-14 px-8 text-lg font-semibold w-full ${!clientName ? 'bg-[#F5970A] hover:bg-[#E08A09] text-white' : ''}`}
            >
              Zum Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
