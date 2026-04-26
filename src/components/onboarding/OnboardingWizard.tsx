import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, MapPin, Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ProfessionSelector } from './ProfessionSelector';

interface OnboardingWizardProps {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { role, user } = useAuth();
  const isProvider = role === 'provider';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [professionDone, setProfessionDone] = useState(false);

  const requestLocation = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'granted') {
        setLocationGranted(true);
        toast({ title: 'Standort aktiviert', description: 'GPS-Zugriff wurde gewährt.' });
      } else {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationGranted(true);
            toast({ title: 'Standort aktiviert', description: 'GPS-Zugriff wurde gewährt.' });
          },
          () => {
            toast({ 
              title: 'Standort verweigert', 
              description: 'Du kannst dies später in den Einstellungen ändern.',
              variant: 'destructive'
            });
          }
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const requestNotifications = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsGranted(true);
          toast({ title: 'Benachrichtigungen aktiviert', description: 'Du wirst ab jetzt benachrichtigt.' });
        } else {
          toast({ 
            title: 'Benachrichtigungen verweigert', 
            description: 'Du kannst dies später in den Einstellungen ändern.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  };

  const saveBusinessName = async () => {
    if (!user || !businessName.trim()) return;
    
    try {
      // Check if business settings exist
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('business_settings')
          .update({ business_name: businessName.trim() })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('business_settings')
          .insert({ user_id: user.id, business_name: businessName.trim() });
      }
    } catch (error) {
      console.error('Error saving business name:', error);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      if (isProvider && businessName.trim()) {
        await saveBusinessName();
      }
      await onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    const maxSlides = isProvider ? 3 : 2;
    if (currentSlide < maxSlides) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Provider slides
  const providerSlides = [
    // Slide 0: Profession Selection
    <div key="profession">
      {user && (
        <ProfessionSelector
          userId={user.id}
          onComplete={() => {
            setProfessionDone(true);
            handleNext();
          }}
        />
      )}
    </div>,

    // Slide 1: Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="relative mx-auto w-32 h-32">
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="w-full h-full object-contain"
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center"
        >
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </motion.div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Willkommen bei Hufi!
        </h2>
        <p className="text-muted-foreground text-lg">
          Dein digitales Büro ist bereit.
        </p>
      </div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        In wenigen Schritten richten wir alles ein, damit du direkt loslegen kannst.
      </p>
    </div>,

    // Slide 1: Permissions
    <div key="permissions" className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Berechtigungen
        </h2>
        <p className="text-muted-foreground">
          Damit der Feierabend-Modus und das Navi funktionieren, brauchen wir Zugriff:
        </p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={requestLocation}
          className={cn(
            "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
            locationGranted 
              ? "border-green-500 bg-green-500/10" 
              : "border-border hover:border-primary hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            locationGranted ? "bg-green-500/20" : "bg-primary/10"
          )}>
            <MapPin className={cn("h-6 w-6", locationGranted ? "text-green-500" : "text-primary")} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Standort (GPS)</p>
            <p className="text-sm text-muted-foreground">
              Für Navigation zu deinen Kunden
            </p>
          </div>
          {locationGranted && (
            <span className="text-green-500 text-sm font-medium">✓ Aktiviert</span>
          )}
        </button>

        <button
          onClick={requestNotifications}
          className={cn(
            "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left",
            notificationsGranted 
              ? "border-green-500 bg-green-500/10" 
              : "border-border hover:border-primary hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            notificationsGranted ? "bg-green-500/20" : "bg-primary/10"
          )}>
            <Bell className={cn("h-6 w-6", notificationsGranted ? "text-green-500" : "text-primary")} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Benachrichtigungen</p>
            <p className="text-sm text-muted-foreground">
              Für Terminerinnerungen & Kundenanfragen
            </p>
          </div>
          {notificationsGranted && (
            <span className="text-green-500 text-sm font-medium">✓ Aktiviert</span>
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Du kannst diese Einstellungen jederzeit ändern.
      </p>
    </div>,

    // Slide 2: Quick Setup
    <div key="setup" className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Quick-Setup
        </h2>
        <p className="text-muted-foreground">
          Wie heißt dein Business?
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="businessName">Business-Name</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="z.B. Hufeisen-Profi Max"
          className="h-12 text-lg"
        />
        <p className="text-xs text-muted-foreground">
          Erscheint auf deiner Landingpage und in E-Mails.
        </p>
      </div>
    </div>,

    // Slide 3: Tour Highlights
    <div key="tour" className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Dein Dashboard
        </h2>
        <p className="text-muted-foreground">
          Hier findest du alles Wichtige:
        </p>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-medium text-foreground">Kalender</p>
              <p className="text-sm text-muted-foreground">Alle deine Termine im Überblick</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-medium text-foreground">Kunden</p>
              <p className="text-sm text-muted-foreground">Verwalte deine Kundenstamm</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💶</span>
            <div>
              <p className="font-medium text-foreground">Rechnungen</p>
              <p className="text-sm text-muted-foreground">Rechnungen erstellen & verwalten</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
  ];

  // Client slides
  const clientSlides = [
    // Slide 0: Welcome
    <div key="welcome" className="text-center space-y-6">
      <div className="relative mx-auto w-32 h-32">
        <img 
          src="https://upload.assaon.com/files/medien/hufiapp-logo-mit-text-1777028919801-id2zm.png" 
          alt="Hufi" 
          className="w-full h-full object-contain"
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center"
        >
          <span className="text-lg">🐴</span>
        </motion.div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Willkommen bei Hufi!
        </h2>
        <p className="text-muted-foreground text-lg">
          Die Daten deines Pferdes – immer griffbereit.
        </p>
      </div>
    </div>,

    // Slide 1: Notifications
    <div key="notifications" className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Verpasse keinen Termin mehr
        </h2>
        <p className="text-muted-foreground">
          Aktiviere Push-Benachrichtigungen für Terminerinnerungen.
        </p>
      </div>

      <button
        onClick={requestNotifications}
        className={cn(
          "w-full p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4",
          notificationsGranted 
            ? "border-green-500 bg-green-500/10" 
            : "border-primary bg-primary/5 hover:bg-primary/10"
        )}
      >
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          notificationsGranted ? "bg-green-500/20" : "bg-primary/20"
        )}>
          <Bell className={cn("h-8 w-8", notificationsGranted ? "text-green-500" : "text-primary")} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground text-lg">
            {notificationsGranted ? 'Aktiviert ✓' : 'Benachrichtigungen aktivieren'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Wir erinnern dich an kommende Termine
          </p>
        </div>
      </button>
    </div>,

    // Slide 2: First Steps
    <div key="first-steps" className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          Erste Schritte
        </h2>
        <p className="text-muted-foreground">
          Lege jetzt dein erstes Pferd an!
        </p>
      </div>

      <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="text-center space-y-4">
          <span className="text-6xl">🐴</span>
          <p className="text-muted-foreground">
            Erstelle ein Profil für dein Pferd mit allen wichtigen Informationen.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Du kannst auch später Pferde hinzufügen.
      </p>
    </div>,
  ];

  const slides = isProvider ? providerSlides : clientSlides;
  const maxSlide = slides.length - 1;
  const isLastSlide = currentSlide === maxSlide;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentSlide 
                    ? "w-8 bg-primary" 
                    : index < currentSlide 
                      ? "w-2 bg-primary/50" 
                      : "w-2 bg-muted"
                )}
              />
            ))}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Überspringen
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {slides[currentSlide]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>

          {isLastSlide ? (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Loslegen!
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              Weiter
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
