import { supabase } from "@/integrations/supabase/client";

// Gewichtete Felder: Feld → Punkte
const FIELDS: Record<string, { points: number; label: string; question: string }> = {
  name:            { points: 5,  label: "Name",            question: "Wie heißt das Pferd?" },
  birth_year:      { points: 5,  label: "Geburtsjahr",     question: "In welchem Jahr wurde [Name] geboren?" },
  breed:           { points: 5,  label: "Rasse",           question: "Welche Rasse hat [Name]?" },
  gender:          { points: 5,  label: "Geschlecht",      question: "Was ist [Name]'s Geschlecht?" },
  color:           { points: 3,  label: "Farbe",           question: "Welche Farbe hat [Name]?" },
  owner_name:      { points: 4,  label: "Besitzername",    question: "Wer ist der Besitzer von [Name]?" },
  last_treatment:  { points: 10, label: "Letzte Hufpflege", question: "Wann war die letzte Hufpflege bei [Name]?" },
  treatment_interval: { points: 8, label: "Pflegerhythmus", question: "In welchem Rhythmus soll [Name] Hufpflege bekommen?" },
  last_vaccine:    { points: 5,  label: "Letzte Impfung",  question: "Wann wurde [Name] zuletzt geimpft?" },
  next_vaccine:    { points: 5,  label: "Nächste Impfung", question: "Wann ist die nächste Impfung für [Name] fällig?" },
  vet_contact:     { points: 5,  label: "Tierarzt",        question: "Welchen Tierarzt nutzt du für [Name]?" },
  special_needs:   { points: 5,  label: "Besonderheiten",  question: "Hat [Name] besondere Anforderungen oder Einschränkungen?" },
  emergency_contact: { points: 5, label: "Notfallkontakt", question: "Wen soll ich im Notfall bei [Name] anrufen?" },
  last_deworming:  { points: 5,  label: "Entwurmung",     question: "Wann wurde [Name] zuletzt entwurmt?" },
  hoof_notes:      { points: 5,  label: "Hufnotizen",     question: "Gibt es besondere Hinweise zu den Hufen von [Name]?" },
};

const MAX_SCORE = Object.values(FIELDS).reduce((s, f) => s + f.points, 0);

export interface CompletenessResult {
  score: number;           // 0–100
  missingFields: string[]; // Feld-Keys die fehlen
  nextQuestion: string | null; // Wichtigste nächste Frage
}

export function calculateScore(horse: Record<string, unknown>): CompletenessResult {
  let earned = 0;
  const missing: string[] = [];

  for (const [key, meta] of Object.entries(FIELDS)) {
    const val = horse[key];
    if (val !== null && val !== undefined && val !== "" && val !== 0) {
      earned += meta.points;
    } else {
      missing.push(key);
    }
  }

  const score = Math.round((earned / MAX_SCORE) * 100);
  // Wichtigste fehlende Frage: die mit den meisten Punkten
  const sorted = missing.sort((a, b) => (FIELDS[b]?.points ?? 0) - (FIELDS[a]?.points ?? 0));
  const topField = sorted[0];
  const nextQuestion = topField
    ? FIELDS[topField].question
    : null;

  return { score, missingFields: missing, nextQuestion };
}

export function buildCompletenessQuestion(horseName: string, fieldKey: string): string {
  const field = FIELDS[fieldKey];
  if (!field) return `Kannst du mir mehr über ${horseName} erzählen?`;
  return field.question.replace(/\[Name\]/g, horseName);
}

export async function updateHorseCompleteness(
  horseId: string,
  userId: string,
  horse: Record<string, unknown>
): Promise<CompletenessResult> {
  const result = calculateScore(horse);
  await supabase
    .from("horse_completeness")
    .upsert({
      horse_id: horseId,
      user_id: userId,
      score: result.score,
      missing_fields: result.missingFields,
      updated_at: new Date().toISOString(),
    }, { onConflict: "horse_id,user_id" });
  return result;
}

export async function getIncompleteHorses(userId: string): Promise<Array<{
  horseId: string;
  horseName: string;
  score: number;
  topMissingField: string;
}>> {
  const { data, error } = await supabase
    .from("horse_completeness")
    .select("horse_id, score, missing_fields")
    .eq("user_id", userId)
    .lt("score", 80)
    .order("score", { ascending: true })
    .limit(10);

  if (error || !data) return [];

  // Pferdenamen laden
  const horseIds = data.map((d) => d.horse_id);
  const { data: horses } = await supabase
    .from("horses")
    .select("id, name")
    .in("id", horseIds);

  const horseMap = new Map((horses ?? []).map((h) => [h.id, h.name]));

  return data.map((d) => ({
    horseId: d.horse_id,
    horseName: horseMap.get(d.horse_id) ?? "Unbekanntes Pferd",
    score: d.score,
    topMissingField: (d.missing_fields as string[])[0] ?? "",
  }));
}
