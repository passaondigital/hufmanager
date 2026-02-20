// Feature Flag Status Types
export type FeatureStatus = 'disabled' | 'beta' | 'early_access' | 'public';

export type FeatureCategory = 'core' | 'autoflow' | 'advanced';

export const FEATURE_CATEGORIES: Record<FeatureCategory, { label: string; description: string }> = {
  core: { label: 'Kernmodule', description: 'Grundlegende Plattform-Features' },
  autoflow: { label: 'AutoFlow', description: 'Automatisierungs-Features (planabhängig)' },
  advanced: { label: 'Erweitert', description: 'Zusatzmodule & Beta-Funktionen' },
};

export type FeatureKey = 
  | 'module_invoicing' 
  | 'module_chat' 
  | 'module_maps' 
  | 'module_academy' 
  | 'module_hufanalyse' 
  | 'module_network' 
  | 'module_analytics' 
  | 'beta_features'
  | 'module_team'
  | 'module_office'
  | 'autoflow_reminders'
  | 'autoflow_invoicing'
  | 'autoflow_scheduling'
  | 'autoflow_feedback'
  | 'autoflow_checkin';

export interface FeatureStatuses {
  module_invoicing?: FeatureStatus;
  module_chat?: FeatureStatus;
  module_maps?: FeatureStatus;
  module_academy?: FeatureStatus;
  module_hufanalyse?: FeatureStatus;
  module_network?: FeatureStatus;
  module_analytics?: FeatureStatus;
  beta_features?: FeatureStatus;
  module_team?: FeatureStatus;
  module_office?: FeatureStatus;
  autoflow_reminders?: FeatureStatus;
  autoflow_invoicing?: FeatureStatus;
  autoflow_scheduling?: FeatureStatus;
  autoflow_feedback?: FeatureStatus;
  autoflow_checkin?: FeatureStatus;
}

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  defaultStatus: FeatureStatus;
  category: FeatureCategory;
}

// Feature definitions with metadata
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // Core modules
  { key: 'module_invoicing', name: 'Rechnungen', description: 'Rechnungen erstellen und verwalten', defaultStatus: 'public', category: 'core' },
  { key: 'module_chat', name: 'Chat', description: 'Chat mit Kunden', defaultStatus: 'public', category: 'core' },
  { key: 'module_maps', name: 'Anfahrt / Maps', description: 'Kartennavigation und Routenplanung', defaultStatus: 'public', category: 'core' },
  { key: 'module_academy', name: 'Academy', description: 'Zugriff auf Lernmaterialien', defaultStatus: 'public', category: 'core' },
  { key: 'module_hufanalyse', name: 'Hufanalyse (LTZ)', description: 'LTZ-Hufanalyse-Tool', defaultStatus: 'public', category: 'core' },
  { key: 'module_network', name: 'Netzwerk', description: 'Netzwerk und Verbindungen', defaultStatus: 'public', category: 'core' },
  { key: 'module_analytics', name: 'Analytics', description: 'Analyse und Statistiken', defaultStatus: 'public', category: 'core' },
  
  // AutoFlow features
  { key: 'autoflow_reminders', name: 'Auto-Erinnerungen', description: 'Automatische Terminerinnerungen', defaultStatus: 'disabled', category: 'autoflow' },
  { key: 'autoflow_invoicing', name: 'Auto-Rechnungen', description: 'Automatische Rechnungserstellung', defaultStatus: 'disabled', category: 'autoflow' },
  { key: 'autoflow_scheduling', name: 'Auto-Terminplanung', description: 'Intelligente Terminvorschläge', defaultStatus: 'disabled', category: 'autoflow' },
  { key: 'autoflow_feedback', name: 'Auto-Feedback', description: 'Automatische Feedback-Anfragen', defaultStatus: 'disabled', category: 'autoflow' },
  { key: 'autoflow_checkin', name: 'Monatlicher Check-in', description: 'Automatische Monatsberichte', defaultStatus: 'disabled', category: 'autoflow' },

  // Advanced modules
  { key: 'beta_features', name: 'Beta Features', description: 'Zugang zu neuen Testfunktionen', defaultStatus: 'disabled', category: 'advanced' },
  { key: 'module_team', name: 'Team / Mitarbeiter', description: 'Mitarbeiterverwaltung', defaultStatus: 'disabled', category: 'advanced' },
  { key: 'module_office', name: 'Mein Office', description: 'Dokumente, Formulare & Vorlagen', defaultStatus: 'disabled', category: 'advanced' },
];

// Helper to get features grouped by category
export function getFeaturesByCategory(): Record<FeatureCategory, FeatureDefinition[]> {
  const grouped: Record<FeatureCategory, FeatureDefinition[]> = {
    core: [],
    autoflow: [],
    advanced: [],
  };
  FEATURE_DEFINITIONS.forEach((f) => {
    grouped[f.category].push(f);
  });
  return grouped;
}

// Status display configuration
export const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  disabled: { label: 'Deaktiviert', color: 'text-muted-foreground', badgeVariant: 'outline' },
  beta: { label: 'Beta', color: 'text-orange-500', badgeVariant: 'secondary' },
  early_access: { label: 'Early Access', color: 'text-blue-500', badgeVariant: 'secondary' },
  public: { label: 'Öffentlich', color: 'text-green-500', badgeVariant: 'default' },
};

// Helper: Convert old boolean flags to new status format
export function migrateBooleanToStatus(
  booleanFlags: Record<string, boolean> | null,
  statusFlags: FeatureStatuses | null
): FeatureStatuses {
  const result: FeatureStatuses = { ...statusFlags };
  
  // If we have status flags, they take precedence
  if (statusFlags && Object.keys(statusFlags).length > 0) {
    return result;
  }
  
  // Migrate from boolean flags
  if (booleanFlags) {
    for (const [key, value] of Object.entries(booleanFlags)) {
      if (!(key in result)) {
        (result as Record<string, FeatureStatus>)[key] = value ? 'public' : 'disabled';
      }
    }
  }
  
  return result;
}

// Helper: Check if feature is accessible (public, beta, or early_access)
export function isFeatureAccessible(status: FeatureStatus | undefined): boolean {
  return status === 'public' || status === 'beta' || status === 'early_access';
}

// Helper: Check if feature should show beta badge
export function shouldShowBetaBadge(status: FeatureStatus | undefined): boolean {
  return status === 'beta';
}

// Helper: Check if feature should be completely hidden (disabled or not set)
export function isFeatureHidden(status: FeatureStatus | undefined): boolean {
  return status === 'disabled' || status === undefined;
}
