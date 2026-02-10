// Feature Flag Status Types
export type FeatureStatus = 'disabled' | 'beta' | 'early_access' | 'public';

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
  | 'module_office';

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
}

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  defaultStatus: FeatureStatus;
}

// Feature definitions with metadata
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { key: 'module_invoicing', name: 'Rechnungen', description: 'Rechnungen erstellen und verwalten', defaultStatus: 'public' },
  { key: 'module_chat', name: 'Chat', description: 'Chat mit Kunden', defaultStatus: 'public' },
  { key: 'module_maps', name: 'Anfahrt / Maps', description: 'Kartennavigation und Routenplanung', defaultStatus: 'public' },
  { key: 'module_academy', name: 'Academy', description: 'Zugriff auf Lernmaterialien', defaultStatus: 'public' },
  { key: 'module_hufanalyse', name: 'Hufanalyse (LTZ)', description: 'LTZ-Hufanalyse-Tool', defaultStatus: 'public' },
  { key: 'module_network', name: 'Netzwerk', description: 'Netzwerk und Verbindungen', defaultStatus: 'public' },
  { key: 'module_analytics', name: 'Analytics', description: 'Analyse und Statistiken', defaultStatus: 'public' },
  { key: 'beta_features', name: 'Beta Features', description: 'Zugang zu neuen Testfunktionen', defaultStatus: 'disabled' },
  { key: 'module_team', name: 'Team / Mitarbeiter', description: 'Mitarbeiterverwaltung', defaultStatus: 'disabled' },
  { key: 'module_office', name: 'Mein Office', description: 'Dokumente, Formulare & Vorlagen', defaultStatus: 'disabled' },
];

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
