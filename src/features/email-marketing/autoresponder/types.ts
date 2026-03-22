export type DelayUnit = 'hours' | 'days' | 'weeks';
export type TriggerType = 'list_add' | 'date_reached' | 'manual';

export interface AutomationEmailStep {
  id: string;
  type: 'email';
  subject: string;
  content_html: string;
}

export interface AutomationDelayStep {
  id: string;
  type: 'delay';
  delay_value: number;
  delay_unit: DelayUnit;
}

export type AutomationStep = AutomationEmailStep | AutomationDelayStep;

export interface Automation {
  id?: string;
  name: string;
  trigger_type: TriggerType;
  list_id?: string;
  is_active: boolean;
  steps: AutomationStep[];
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  list_add: 'Kontakt wird zu Liste hinzugefügt',
  date_reached: 'Bestimmtes Datum erreicht',
  manual: 'Manuell gestartet',
};

export const DELAY_UNIT_LABELS: Record<DelayUnit, string> = {
  hours: 'Stunden',
  days: 'Tage',
  weeks: 'Wochen',
};
