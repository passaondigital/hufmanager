// LTZ (Leipziger Technikum) Hoof Analysis Standard Constants

export const STANCE_OPTIONS = [
  { value: 'regular', label: 'Regulär' },
  { value: 'zeheneng', label: 'Zeheneng' },
  { value: 'zehenweit', label: 'Zehenweit' },
  { value: 'bodeneng', label: 'Bodeneng' },
  { value: 'bodenweit', label: 'Bodenweit' },
] as const;

export const CROUP_MOVEMENT_OPTIONS = [
  { value: 'equal', label: 'Gleichmäßig' },
  { value: 'left_higher', label: 'Links höher' },
  { value: 'right_higher', label: 'Rechts höher' },
] as const;

export const BELLY_SWING_OPTIONS = [
  { value: 'equal', label: 'Gleichmäßig' },
  { value: 'left', label: 'Nach links' },
  { value: 'right', label: 'Nach rechts' },
] as const;

export const FOOTFALL_OPTIONS = [
  { value: 'arching', label: 'Bügelt' },
  { value: 'threading', label: 'Schnürt' },
  { value: 'planar', label: 'Plan' },
] as const;

// LTZ Hoof-specific parameters
export const PASTERN_ANGLE_OPTIONS = [
  { value: 'correct', label: 'Ja (1/3 zu 2/3)' },
  { value: 'incorrect', label: 'Nein' },
] as const;

export const CORONET_THEORY_OPTIONS = [
  { value: 'inner', label: 'Innen höher' },
  { value: 'outer', label: 'Außen höher' },
  { value: 'equal', label: 'Gleich' },
] as const;

export const SOLE_FROG_PLANE_OPTIONS = [
  { value: 'inner', label: 'Innen höher' },
  { value: 'outer', label: 'Außen höher' },
  { value: 'equal', label: 'Gleich' },
] as const;

export const LANDING_THEORY_OPTIONS = [
  { value: 'toe', label: 'Zehe' },
  { value: 'heel', label: 'Trachte' },
  { value: 'flat', label: 'Plan' },
  { value: 'unphysiological', label: 'Unphysiologisch' },
] as const;

export const HORN_QUALITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'poor', label: 'Schlecht' },
  { value: 'cracked', label: 'Rissig' },
] as const;

export const TOE_AXIS_OPTIONS = [
  { value: 'straight', label: 'Gerade' },
  { value: 'broken_back', label: 'Gebrochen nach hinten' },
  { value: 'broken_forward', label: 'Gebrochen nach vorne' },
] as const;

export const HOOF_POSITIONS = [
  { key: 'vl', label: 'VL', fullLabel: 'Vorne Links' },
  { key: 'vr', label: 'VR', fullLabel: 'Vorne Rechts' },
  { key: 'hl', label: 'HL', fullLabel: 'Hinten Links' },
  { key: 'hr', label: 'HR', fullLabel: 'Hinten Rechts' },
] as const;

export interface LTZHoofData {
  pasternAngle?: string; // Fesselstand
  coronetTheory?: string; // Kronrandtheorie
  soleFrogPlane?: string; // Sohle-Strahl-Ebene
  landingTheory?: string; // Fußungstheorie
  hornQuality?: string; // Hornqualität
  toeAxis?: string; // Zehenachse
  notes?: string; // Zusätzliche Notizen pro Huf
  photoUrl?: string; // Foto des Hufs
}

export interface LTZAnalysisData {
  // Step 1: Exterieur & Gang
  stanceFront?: string;
  stanceRear?: string;
  croupMovement?: string;
  bellySwing?: string;
  footfallLeft?: string;
  footfallRight?: string;
  
  // Step 2: Per-Hoof Data
  hoofDataVl: LTZHoofData;
  hoofDataVr: LTZHoofData;
  hoofDataHl: LTZHoofData;
  hoofDataHr: LTZHoofData;
  
  // Notes and recommendations
  notes?: string;
  recommendations: string[];
}

// Auto-generate recommendations based on analysis data
export function generateRecommendations(data: LTZAnalysisData): string[] {
  const recommendations: string[] = [];
  
  // Check each hoof for broken toe axis
  const hoofData = [
    { key: 'VL', data: data.hoofDataVl },
    { key: 'VR', data: data.hoofDataVr },
    { key: 'HL', data: data.hoofDataHl },
    { key: 'HR', data: data.hoofDataHr },
  ];
  
  for (const hoof of hoofData) {
    if (hoof.data.toeAxis === 'broken_back') {
      recommendations.push(`${hoof.key}: Trachtenunterstützung / Steiler stellen`);
    }
    if (hoof.data.toeAxis === 'broken_forward') {
      recommendations.push(`${hoof.key}: Zehe kürzen / Flacher stellen`);
    }
    if (hoof.data.landingTheory === 'toe') {
      recommendations.push(`${hoof.key}: Unphysiologische Zehenfußung korrigieren`);
    }
    if (hoof.data.coronetTheory === 'inner' && hoof.data.soleFrogPlane === 'outer') {
      recommendations.push(`${hoof.key}: Diagonale Korrektur erforderlich`);
    }
    if (hoof.data.hornQuality === 'cracked') {
      recommendations.push(`${hoof.key}: Hornqualität verbessern - Biotin/Zink empfohlen`);
    }
    if (hoof.data.hornQuality === 'poor') {
      recommendations.push(`${hoof.key}: Auf gute Hufpflege achten`);
    }
  }
  
  // Check stance
  if (data.stanceFront === 'zeheneng' || data.stanceRear === 'zeheneng') {
    recommendations.push('Zehenenge Stellung: Auf laterale Balance achten');
  }
  if (data.stanceFront === 'zehenweit' || data.stanceRear === 'zehenweit') {
    recommendations.push('Zehenweite Stellung: Auf mediale Balance achten');
  }
  
  // Check croup movement
  if (data.croupMovement === 'left_higher') {
    recommendations.push('Kruppe links höher: Mögliche Blockade/Kompensation links');
  }
  if (data.croupMovement === 'right_higher') {
    recommendations.push('Kruppe rechts höher: Mögliche Blockade/Kompensation rechts');
  }
  
  return recommendations;
}
