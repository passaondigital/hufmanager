// Shared calculator logic for Kalkulator page and PricingCalculatorSection

export const PROVIDER_ID = "99e50f7f-c2d1-4ce4-ba99-d7dc800e5090";

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  tier: string | null;
  plan_type: string | null;
  price_monthly: number;
  price_per_appointment: number | null;
  travel_fee_zone1: number | null;
  travel_fee_zone2: number | null;
  discount_per_extra_horse: number | null;
  flat_price: number | null;
  interval_weeks: number | null;
  duration_weeks: number | null;
  max_appointments: number | null;
  includes: string[] | null;
  not_included: string[] | null;
  badge_color: string | null;
  requires_application: boolean | null;
};

export interface GOCalc {
  perAppointment: number;
  appointmentsPerYear: number;
  perYear: number;
  perMonth: number;
}

export interface BalanceCalc {
  monthlyBase: number;
  travelPerYear: number;
  perYear: number;
  perMonth: number;
  appointmentsPerYear: number;
}

export function calcGO(horses: number, zone: 1 | 2, intervalWeeks: number, plan: Plan): GOCalc {
  const perHorse = plan.price_per_appointment || 65;
  const travelFee = zone === 1 ? (plan.travel_fee_zone1 || 10) : (plan.travel_fee_zone2 || 20);
  const perAppointment = (horses * perHorse) + travelFee;
  const appointmentsPerYear = Math.ceil(52 / intervalWeeks);
  const perYear = perAppointment * appointmentsPerYear;
  const perMonth = perYear / 12;
  return { perAppointment, appointmentsPerYear, perYear, perMonth };
}

export function calcBalance(horses: number, zone: 1 | 2, intervalWeeks: number, plan: Plan): BalanceCalc {
  const base = plan.price_monthly || 65;
  const discountRate = (plan.discount_per_extra_horse || 0) / 100;
  let monthlyBase = base;
  for (let i = 1; i < horses; i++) {
    monthlyBase += base * (1 - discountRate);
  }
  const travelFee = zone === 1 ? (plan.travel_fee_zone1 || 10) : (plan.travel_fee_zone2 || 20);
  const appointmentsPerYear = Math.ceil(52 / intervalWeeks);
  const travelPerYear = travelFee * appointmentsPerYear;
  const perYear = (monthlyBase * 12) + travelPerYear;
  const perMonth = perYear / 12;
  return { monthlyBase, travelPerYear, perYear, perMonth, appointmentsPerYear };
}

export function calcSavings(goPerYear: number, balancePerYear: number): number {
  return Math.max(0, goPerYear - balancePerYear);
}
