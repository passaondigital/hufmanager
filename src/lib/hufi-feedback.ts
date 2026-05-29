import { supabase } from "@/integrations/supabase/client";
import { updateHufiMemory } from "./hufi-brain";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedbackRequest {
  id: string;
  user_id: string;
  appointment_id?: string;
  horse_name?: string;
  rating?: number;
  response?: string;
  scheduled_at: string;
  sent: boolean;
  responded_at?: string;
}

// ── scheduleFeedbackRequest ───────────────────────────────────────────────────

export async function scheduleFeedbackRequest(
  userId: string,
  appointmentId: string,
  horseName: string,
  delayHours = 2,
): Promise<void> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

    await from("hufi_feedback").insert({
      user_id: userId,
      appointment_id: appointmentId,
      horse_name: horseName,
      scheduled_at: scheduledAt,
      sent: false,
    });

    await updateHufiMemory(
      userId,
      "routine",
      `feedback_scheduled_${appointmentId}`,
      {
        appointment_id: appointmentId,
        horse_name: horseName,
        scheduled_at: scheduledAt,
      },
      "system",
    );
  } catch (err) {
    console.warn("[HufiFeedback] scheduleFeedbackRequest failed:", err);
  }
}

// ── submitFeedback ────────────────────────────────────────────────────────────

export async function submitFeedback(
  feedbackId: string,
  userId: string,
  rating: number,
  comment: string,
): Promise<void> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    await from("hufi_feedback")
      .update({
        rating,
        response: comment.slice(0, 500),
        sent: true,
        responded_at: new Date().toISOString(),
      })
      .eq("id", feedbackId)
      .eq("user_id", userId);

    if (rating <= 2) {
      await updateHufiMemory(
        userId,
        "alert",
        `low_rating_${feedbackId}`,
        {
          active: true,
          message: `⭐ Niedrige Bewertung (${rating}/5) — bitte reagieren`,
          feedback_id: feedbackId,
          rating,
          comment: comment.slice(0, 200),
        },
        "system",
      );
    }
  } catch (err) {
    console.warn("[HufiFeedback] submitFeedback failed:", err);
  }
}

// ── generateFeedbackMessage ───────────────────────────────────────────────────

export function generateFeedbackMessage(horseName: string, appointmentDate?: string): string {
  const dateStr = appointmentDate
    ? ` vom ${format(new Date(appointmentDate), "dd.MM.")}`
    : "";
  return `Wie war der Besuch${dateStr} bei ${horseName}? ⭐\n\nDeine kurze Einschätzung hilft uns, den Service zu verbessern.\n\nAuf einer Skala von 1–5 — wie zufrieden bist du?`;
}

// ── getPendingFeedbackRequests ────────────────────────────────────────────────

export async function getPendingFeedbackRequests(
  userId: string,
): Promise<FeedbackRequest[]> {
  try {
    const from = (t: string) =>
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(t);

    const { data } = (await from("hufi_feedback")
      .select("*")
      .eq("user_id", userId)
      .eq("sent", false)
      .lte("scheduled_at", new Date().toISOString())
      .limit(5)) as { data: unknown[] | null };

    return (data ?? []) as FeedbackRequest[];
  } catch {
    return [];
  }
}
