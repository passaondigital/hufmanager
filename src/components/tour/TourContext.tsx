import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SpotlightTour, TourStep } from './SpotlightTour';
import {
  dashboardTourSteps,
  customersTourSteps,
  calendarTourSteps,
  invoicesTourSteps,
  partnerTourSteps,
  employeeTourSteps,
  clientTourSteps,
} from './tourDefinitions';

type TourName = 'dashboard' | 'customers' | 'calendar' | 'invoices' | 'partner' | 'employee' | 'client';

const tourMap: Record<TourName, TourStep[]> = {
  dashboard: dashboardTourSteps,
  customers: customersTourSteps,
  calendar: calendarTourSteps,
  invoices: invoicesTourSteps,
  partner: partnerTourSteps,
  employee: employeeTourSteps,
  client: clientTourSteps,
};

interface TourContextType {
  startTour: (name: TourName) => void;
  isAnyTourActive: boolean;
}

const TourContext = createContext<TourContextType>({
  startTour: () => {},
  isAnyTourActive: false,
});

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourName | null>(null);

  const startTour = useCallback((name: TourName) => {
    setActiveTour(name);
  }, []);

  const closeTour = useCallback(() => {
    setActiveTour(null);
  }, []);

  return (
    <TourContext.Provider value={{ startTour, isAnyTourActive: !!activeTour }}>
      {children}
      <SpotlightTour
        steps={activeTour ? tourMap[activeTour] : []}
        isOpen={!!activeTour}
        onClose={closeTour}
        onComplete={closeTour}
      />
    </TourContext.Provider>
  );
}
