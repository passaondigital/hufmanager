import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Check, ArrowRight, MapPin, Phone, Building2, Users, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CountrySelectionStep } from './CountrySelectionStep';
import { CommunicationModeSelector } from './CommunicationModeSelector';
import { SetupCompleteScreen } from './SetupCompleteScreen';
import { TaxCountry, getDACHConfig, getCurrencyForCountry } from '@/lib/dachConfig';
import { format, addDays } from 'date-fns';

interface ProviderSetupWizardProps {
  onComplete: () => void;
}

type WizardPhase = 'welcome' | 'steps' | 'complete';

interface OnboardingResult {
  horseName?: string;
  clientName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  clientId?: string;
}

export function ProviderSetupWizard({ onComplete }: ProviderSetupWizardProps) {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Hufbearbeiter';
  const [phase, setPhase] = useState<WizardPhase>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardingResult>({});
  
  // Step 1: Betrieb
  const [taxCountry, setTaxCountry] = useState<TaxCountry>('DE');
  const [businessName, setBusinessName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Erster Kunde
  const [clientName, setClientName] = useState('');
  const [horseName, setHorseName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Step 3: Erster Termin
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const [appointmentDate, setAppointmentDate] = useState(tomorrow);
  const [appointmentTime, setAppointmentTime] = useState('08:00');

  const [commModeSelected, setCommModeSelected] = useState(false);

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // country always ok
      case 1: return businessName.trim().length >= 2;
      case 2: return true; // communication step is skippable
      case 3: return true; // client step is skippable
      case 4: return true; // appointment step is skippable
      default: return false;
    }
  };

  const handleNext = async () => {
    // Save step 1 data immediately when moving to step 2
    if (currentStep === 1 && user) {
      await saveBusinessData();
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const saveBusinessData = async () => {
    if (!user) return;
    const config = getDACHConfig(taxCountry);
    const currency = getCurrencyForCountry(taxCountry);

    const { data: existing } = await supabase
      .from('business_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const payload = {
      business_name: businessName.trim() || undefined,
      tax_country: taxCountry,
      currency,
      default_vat_rate: config.defaultVatRate,
      swiss_rounding: taxCountry === 'CH',
      country: taxCountry,
      kleine_unternehmer: true,
      phone: phone.trim() || undefined,
      address: zipCode.trim() || undefined,
    };

    if (existing) {
      await supabase.from('business_settings').update(payload).eq('user_id', user.id);
    } else {
      await supabase.from('business_settings').insert({ user_id: user.id, ...payload });
    }

    // Update profile
    await supabase.from('profiles').update({
      country: taxCountry,
      preferred_currency: currency,
      zip_code: zipCode.trim() || undefined,
      mobile: phone.trim() || undefined,
    }).eq('id', user.id);
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Save business data if not saved yet
      if (businessName.trim()) {
        await saveBusinessData();
      }

      let createdClientId: string | undefined;
      let createdHorseId: string | undefined;

      // Create ghost profile + horse if client data provided
      if (clientName.trim() && horseName.trim()) {
        // Create ghost profile for client
        const { data: ghostProfile } = await supabase
          .from('profiles')
          .insert({
            full_name: clientName.trim(),
            mobile: clientPhone.trim() || null,
            created_by_provider_id: user.id,
            onboarding_completed: false as boolean,
          } as any)
          .select('id')
          .single();

        if (ghostProfile) {
          createdClientId = ghostProfile.id;

          // Create contact
          await supabase.from('contacts').insert({
            provider_id: user.id,
            full_name: clientName.trim(),
            phone: clientPhone.trim() || null,
            category: 'client',
            profile_id: ghostProfile.id,
          });

          // Create horse with ghost profile as owner
          const { data: horseData } = await supabase.from('horses').insert({
            name: horseName.trim(),
            owner_id: ghostProfile.id,
          }).select('id').single();

          if (horseData) {
            createdHorseId = horseData.id;
          }

          // Access grant is auto-created by trigger
        }
      }

      // Create appointment if date provided and horse exists
      if (appointmentDate && createdHorseId && createdClientId) {
        await supabase.from('appointments').insert({
          provider_id: user.id,
          horse_id: createdHorseId,
          client_id: createdClientId,
          date: appointmentDate,
          time: appointmentTime || '08:00',
          status: 'planned',
          service_type: 'Ausschneiden',
        });
      }

      // Mark onboarding complete
      await supabase.from('profiles').update({
        onboarding_completed: true,
      }).eq('id', user.id);

      setResult({
        horseName: horseName.trim() || undefined,
        clientName: clientName.trim() || undefined,
        appointmentDate: appointmentDate || undefined,
        appointmentTime: appointmentTime || undefined,
        clientId: createdClientId,
      });

      setPhase('complete');
    } catch (error) {
      console.error('Error completing setup:', error);
      toast.error('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──────── WELCOME SCREEN ────────
  if (phase === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
          >
            <span className="text-5xl">🐴</span>
          </motion.div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              Willkommen bei HufManager!
            </h1>
            <p className="text-xl text-muted-foreground">
              Hallo {displayName}!
            </p>
            <p className="text-lg text-muted-foreground">
              In <strong className="text-foreground">3 Minuten</strong> bist du startklar.
            </p>
            <p className="text-sm text-muted-foreground">
              Wir richten alles gemeinsam ein.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => setPhase('steps')}
              className="gap-2 h-14 px-8 text-lg font-semibold w-full bg-[#F5970A] hover:bg-[#E08A09] text-white"
            >
              Los geht's
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (user) {
                  await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
                }
                onComplete();
              }}
              className="text-xs text-muted-foreground"
            >
              Überspringen — ich kenne mich aus
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ──────── COMPLETE SCREEN ────────
  if (phase === 'complete') {
    return (
      <SetupCompleteScreen
        displayName={displayName}
        horseName={result.horseName}
        clientName={result.clientName}
        appointmentDate={result.appointmentDate}
        appointmentTime={result.appointmentTime}
        clientId={result.clientId}
        onContinue={onComplete}
      />
    );
  }

  // ──────── STEP CONTENT ────────
  const stepMeta = [
    { icon: '🌍', label: 'Land' },
    { icon: '🏢', label: 'Betrieb' },
    { icon: '💬', label: 'Kommunikation' },
    { icon: '👥', label: 'Kunde' },
    { icon: '📅', label: 'Termin' },
  ];

  const steps = [
    // Step 0: Country
    <CountrySelectionStep key="country" value={taxCountry} onChange={setTaxCountry} />,

    // Step 1: Business – Name + PLZ + Telefon
    <div key="business" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Dein Betrieb</h2>
        <p className="text-muted-foreground">Nur das Nötigste – den Rest kannst du später ergänzen.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-base">Name / Betriebsname *</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="z.B. Hufpflege Schmidt"
            className="h-14 text-lg"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode" className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            PLZ / Ort
          </Label>
          <Input
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="z.B. 80331 München"
            className="h-12 text-lg"
          />
          <p className="text-xs text-muted-foreground">Für Routenplanung & Tourenoptimierung</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Telefon
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="z.B. 0171 1234567"
            className="h-12 text-lg"
          />
          <p className="text-xs text-muted-foreground">Für WhatsApp-Einladungen an Kunden</p>
        </div>
      </div>
    </div>,

    // Step 2: Communication Mode
    <div key="communication" className="space-y-6">
      <CommunicationModeSelector
        onSelect={async (mode, number) => {
          if (!user) return;
          const { data: existing } = await supabase
            .from('business_settings')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          const payload: Record<string, unknown> = { communication_mode: mode };
          if (mode === 'whatsapp' && number) payload.whatsapp_number = number;

          if (existing) {
            await supabase.from('business_settings').update(payload).eq('user_id', user.id);
          } else {
            await supabase.from('business_settings').insert({ user_id: user.id, ...payload });
          }
          setCommModeSelected(true);
        }}
        onSkip={() => handleSkip()}
      />
    </div>,

    // Step 3: Erster Kunde + Pferd
    <div key="client" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Leg deinen ersten Kunden an</h2>
        <p className="text-muted-foreground">Dauert 30 Sekunden. Alles andere später.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientName" className="text-base">Kundenname</Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="z.B. Vorname Nachname"
            className="h-12 text-lg"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horseName" className="text-base">Pferdename</Label>
          <Input
            id="horseName"
            value={horseName}
            onChange={(e) => setHorseName(e.target.value)}
            placeholder="z.B. Bella"
            className="h-12 text-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientPhone" className="text-base">Telefon (optional)</Label>
          <Input
            id="clientPhone"
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="z.B. 0171 9876543"
            className="h-12 text-lg"
          />
        </div>
      </div>
    </div>,

    // Step 3: Erster Termin
    <div key="appointment" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {clientName.trim() ? `Wann besuchst du ${clientName.trim().split(' ')[0]}?` : 'Dein erster Termin'}
        </h2>
        <p className="text-muted-foreground">
          {horseName.trim() ? `Termin für ${horseName.trim()}` : 'Wann ist dein nächster Besuch?'}
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="appointmentDate" className="text-base">Datum</Label>
          <Input
            id="appointmentDate"
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="h-12 text-lg"
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appointmentTime" className="text-base">Uhrzeit</Label>
          <Input
            id="appointmentTime"
            type="time"
            value={appointmentTime}
            onChange={(e) => setAppointmentTime(e.target.value)}
            className="h-12 text-lg"
          />
        </div>
      </div>
      {(!clientName.trim() || !horseName.trim()) && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground text-center">
            💡 Du hast im vorherigen Schritt keinen Kunden angelegt. Du kannst Termine auch später im Kalender erstellen.
          </p>
        </div>
      )}
    </div>,
  ];

  const isSkippable = currentStep >= 2; // Communication, Kunde & Termin skippable
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-start justify-center p-4 overflow-y-auto pb-24">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Schritt {currentStep + 1} von {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-[#F5970A]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>

        {/* Card */}
        <Card className="border-border shadow-2xl">
          <CardContent className="p-6 pt-8">
            <AnimatePresence mode="wait">
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {steps[currentStep]}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Zurück
              </Button>

              <div className="flex items-center gap-2">
                {isSkippable && (
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground">
                    Überspringen
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={(!canProceed() && !isSkippable) || isSubmitting}
                  className="gap-2 min-w-[120px] bg-[#F5970A] hover:bg-[#E08A09] text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLastStep ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Fertig!
                    </>
                  ) : (
                    <>
                      Weiter
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step dots */}
        <div className="flex justify-center gap-3 mt-6">
          {stepMeta.map((meta, step) => (
            <div
              key={step}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all text-sm',
                step < currentStep
                  ? 'bg-[#F5970A] border-[#F5970A] text-white'
                  : step === currentStep
                    ? 'border-[#F5970A] text-[#F5970A]'
                    : 'border-muted text-muted-foreground'
              )}
            >
              {step < currentStep ? <Check className="h-5 w-5" /> : <span>{meta.icon}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
