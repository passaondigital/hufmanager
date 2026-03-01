import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Building2, Euro, Calendar, FileText, Loader2, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CountrySelectionStep } from './CountrySelectionStep';
import { SetupCompleteScreen } from './SetupCompleteScreen';
import { TaxCountry, getDACHConfig, getCurrencyForCountry } from '@/lib/dachConfig';

interface ProviderSetupWizardProps {
  onComplete: () => void;
}

type WizardPhase = 'welcome' | 'steps' | 'complete';

export function ProviderSetupWizard({ onComplete }: ProviderSetupWizardProps) {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Hufbearbeiter';
  const [phase, setPhase] = useState<WizardPhase>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [taxCountry, setTaxCountry] = useState<TaxCountry>('DE');
  const [businessName, setBusinessName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [horseName, setHorseName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [impressumText, setImpressumText] = useState('');

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currencySymbol = taxCountry === 'CH' ? 'CHF' : '€';

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // country
      case 1: return businessName.trim().length >= 2;
      case 2: return defaultPrice.trim().length > 0 && !isNaN(parseFloat(defaultPrice));
      case 3: return horseName.trim().length >= 2 && ownerName.trim().length >= 2;
      case 4: return impressumText.trim().length >= 20;
      default: return false;
    }
  };

  const canSkip = (step: number) => step === 3 || step === 4; // Horse & Impressum skippable

  const handleNext = async () => {
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

  const handleComplete = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    const config = getDACHConfig(taxCountry);
    const currency = getCurrencyForCountry(taxCountry);
    
    try {
      // Save business settings
      const { data: existingSettings } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const settingsPayload = {
        business_name: businessName.trim() || undefined,
        tax_country: taxCountry,
        currency: currency,
        default_vat_rate: config.defaultVatRate,
        swiss_rounding: taxCountry === 'CH',
        impressum_text: impressumText.trim() || undefined,
        country: taxCountry,
        kleine_unternehmer: true,
        rksv_enabled: false,
        mwst_pflichtig: false,
      };

      if (existingSettings) {
        await supabase.from('business_settings').update(settingsPayload).eq('user_id', user.id);
      } else {
        await supabase.from('business_settings').insert({ user_id: user.id, ...settingsPayload });
      }

      // Create default service if price given
      if (defaultPrice.trim()) {
        const priceValue = parseFloat(defaultPrice.replace(',', '.'));
        const { data: existingService } = await supabase
          .from('offers')
          .select('id')
          .eq('provider_id', user.id)
          .eq('title', 'Ausschneiden')
          .maybeSingle();

        if (!existingService) {
          await supabase.from('offers').insert({
            provider_id: user.id,
            title: 'Ausschneiden',
            price: priceValue,
            price_type: 'fixed',
            is_active: true,
            sort_order: 0,
            offer_type: 'service',
          });
        }
      }

      // Create first client + horse if provided
      if (ownerName.trim() && horseName.trim()) {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            provider_id: user.id,
            full_name: ownerName.trim(),
            phone: ownerPhone.trim() || null,
            category: 'client',
          })
          .select('id')
          .single();

        if (newContact) {
          await supabase.from('horses').insert({
            name: horseName.trim(),
            owner_id: user.id,
          });
        }
      }

      // Mark onboarding complete
      await supabase.from('profiles').update({ 
        onboarding_completed: true,
        country: taxCountry,
        preferred_currency: currency,
      }).eq('id', user.id);

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
              Schön dass du da bist, {displayName}!
            </h1>
            <p className="text-lg text-muted-foreground">
              In <strong className="text-foreground">3 Minuten</strong> bist du startklar.
            </p>
            <p className="text-sm text-muted-foreground">
              Wir richten gemeinsam deinen HufManager ein — Schritt für Schritt.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => setPhase('steps')}
              className="gap-2 h-14 px-8 text-lg font-semibold w-full"
            >
              Einrichtung starten
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
    return <SetupCompleteScreen displayName={displayName} onContinue={onComplete} />;
  }

  // ──────── STEP CONTENT ────────
  const stepMeta = [
    { icon: '🌍', label: 'Land' },
    { icon: '🏢', label: 'Betrieb' },
    { icon: '💶', label: 'Preis' },
    { icon: '🐴', label: 'Pferd' },
    { icon: '📋', label: 'Impressum' },
  ];

  const steps = [
    <CountrySelectionStep key="country" value={taxCountry} onChange={setTaxCountry} />,

    // Business Name
    <div key="business" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Wie heißt dein Huf-Business?</h2>
        <p className="text-muted-foreground">
          Dieser Name erscheint auf Rechnungen und deiner Webseite.
        </p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="businessName" className="text-base">Firmenname</Label>
        <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="z.B. Hufpflege Schmidt" className="h-14 text-lg" autoFocus />
      </div>
    </div>,

    // Price
    <div key="price" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Euro className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Was kostet Ausschneiden?</h2>
        <p className="text-muted-foreground">Dein Standard-Preis. Du kannst später weitere Services anlegen.</p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="defaultPrice" className="text-base">Preis in {currencySymbol}</Label>
        <div className="relative">
          <Input id="defaultPrice" type="text" inputMode="decimal" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} placeholder="z.B. 45" className="h-14 text-lg pl-12" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{currencySymbol}</span>
        </div>
      </div>
    </div>,

    // First Horse + Client
    <div key="horse" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-3xl">🐴</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Dein erstes Kunden-Pferd</h2>
        <p className="text-muted-foreground">Name, Besitzer, fertig. Dauert 30 Sekunden.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="horseName" className="text-base">Pferdename</Label>
          <Input id="horseName" value={horseName} onChange={(e) => setHorseName(e.target.value)} placeholder="z.B. Bella" className="h-12 text-lg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerName" className="text-base">Besitzer</Label>
          <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="z.B. Maria Müller" className="h-12 text-lg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerPhone" className="text-base">Telefon (optional)</Label>
          <Input id="ownerPhone" type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="z.B. 0171 1234567" className="h-12 text-lg" />
        </div>
      </div>
    </div>,

    // Impressum
    <div key="impressum" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Impressum hinterlegen</h2>
        <p className="text-muted-foreground">
          Pflichtangabe für deine öffentliche Seite. Ohne Impressum bleibt dein Profil offline.
        </p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="impressumText" className="text-base">Impressum</Label>
        <textarea
          id="impressumText"
          value={impressumText}
          onChange={(e) => setImpressumText(e.target.value)}
          placeholder={"Max Mustermann\nMusterstraße 1\n12345 Musterstadt\nTel: 0123 456789\nE-Mail: info@example.de"}
          className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">Mindestens: Name, Anschrift, E-Mail.</p>
      </div>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
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
            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
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
                {canSkip(currentStep) && (
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground">
                    Später erledigen
                  </Button>
                )}
                <Button onClick={handleNext} disabled={(!canProceed() && !canSkip(currentStep)) || isSubmitting} className="gap-2 min-w-[120px]">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentStep === totalSteps - 1 ? (
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
                  ? 'bg-primary border-primary text-primary-foreground'
                  : step === currentStep
                    ? 'border-primary text-primary'
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
