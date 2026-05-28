import { createContext, useContext, useState, useCallback, useEffect, ReactNode, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import type { TourStep } from './SpotlightTour';
import type { DemoRole } from './demoTourDefinitions';
import { useAuth } from '@/hooks/useAuth';
import { isDemoEmail, DEMO_EMAILS } from '@/lib/demo-accounts';

const SpotlightTour = lazy(() =>
  import('./SpotlightTour').then((m) => ({ default: m.SpotlightTour }))
);
const DemoWelcomeModal = lazy(() =>
  import('./DemoWelcomeModal').then((m) => ({ default: m.DemoWelcomeModal }))
);

type TourName = 'dashboard' | 'customers' | 'calendar' | 'invoices' | 'partner' | 'employee' | 'client';

interface TourContextType {
  startTour: (name: TourName) => void;
  isAnyTourActive: boolean;
  /** Opens the demo welcome modal for topic selection */
  openDemoWelcome: () => void;
}

const TourContext = createContext<TourContextType>({
  startTour: () => {},
  isAnyTourActive: false,
  openDemoWelcome: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

function getDemoRole(email: string | undefined | null): DemoRole | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (lower === DEMO_EMAILS.provider) return 'provider';
  if (lower === DEMO_EMAILS.client) return 'client';
  if (lower === DEMO_EMAILS.partner) return 'partner';
  if (lower === DEMO_EMAILS.employee) return 'employee';
  return null;
}

const DEMO_WELCOME_SHOWN_KEY = 'hufmanager_demo_welcome_shown';

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [currentSteps, setCurrentSteps] = useState<TourStep[]>([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const isPublicStandalone = location.pathname.startsWith('/pferdeakte');

  const demoRole = getDemoRole(user?.email);
  const isDemo = isDemoEmail(user?.email);

  // Auto-show welcome modal on first demo load
  useEffect(() => {
    if (isPublicStandalone) return;
    if (!isDemo || !demoRole || !user?.id) return;
    const key = `${DEMO_WELCOME_SHOWN_KEY}_${user.id}`;
    const alreadyShown = sessionStorage.getItem(key);
    if (!alreadyShown) {
      const timer = setTimeout(() => {
        setWelcomeOpen(true);
        sessionStorage.setItem(key, '1');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isDemo, demoRole, user?.id, isPublicStandalone]);

  const startTour = useCallback((name: TourName) => {
    void import('./tourDefinitions').then((m) => {
      const tourMap: Record<TourName, TourStep[]> = {
        dashboard: m.dashboardTourSteps,
        customers: m.customersTourSteps,
        calendar: m.calendarTourSteps,
        invoices: m.invoicesTourSteps,
        partner: m.partnerTourSteps,
        employee: m.employeeTourSteps,
        client: m.clientTourSteps,
      };
      setCurrentSteps(tourMap[name] || []);
    });
  }, []);

  const openDemoWelcome = useCallback(() => {
    setWelcomeOpen(true);
  }, []);

  const handleDemoTourStart = useCallback((topicId: string, mode: 'quick' | 'detailed') => {
    if (!demoRole) return;
    void import('./demoTourDefinitions').then(({ demoTourConfigs, ctaStep }) => {
      const config = demoTourConfigs[demoRole];
      const topicSteps = config.steps[topicId]?.[mode];
      if (!topicSteps) return;
      setCurrentSteps([...topicSteps, ctaStep]);
    });
  }, [demoRole]);

  const closeTour = useCallback(() => {
    setCurrentSteps([]);
  }, []);

  // On public standalone pages, render only children with no-op context
  if (isPublicStandalone) {
    return (
      <TourContext.Provider value={{ startTour: () => {}, isAnyTourActive: false, openDemoWelcome: () => {} }}>
        {children}
      </TourContext.Provider>
    );
  }

  const isActive = currentSteps.length > 0;

  return (
    <TourContext.Provider value={{ startTour, isAnyTourActive: isActive, openDemoWelcome }}>
      {children}
      {isActive && (
        <Suspense fallback={null}>
          <SpotlightTour
            steps={currentSteps}
            isOpen={isActive}
            onClose={closeTour}
            onComplete={closeTour}
          />
        </Suspense>
      )}
      {demoRole && welcomeOpen && (
        <Suspense fallback={null}>
          <DemoWelcomeModal
            role={demoRole}
            open={welcomeOpen}
            onClose={() => setWelcomeOpen(false)}
            onStartTour={handleDemoTourStart}
          />
        </Suspense>
      )}
    </TourContext.Provider>
  );
}
