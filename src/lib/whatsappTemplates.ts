/**
 * Vorausgefüllte WhatsApp-Nachrichtentexte für verschiedene Kontexte.
 * Der Provider kann den Text vor dem Senden in WhatsApp noch bearbeiten.
 */

export function waTextGeneral(name: string): string {
  return `Hallo ${name},`;
}

export function waTextAppointmentConfirm(name: string, date: string, time: string, horse: string): string {
  return `Hallo ${name}, dein Termin am ${date} um ${time} ist bestätigt. Pferd: ${horse}. 🐴`;
}

export function waTextAppointmentReminder(name: string, date: string, time: string, horse: string, daysUntil: number): string {
  if (daysUntil === 0) {
    return `Hallo ${name}, ich bin heute um ${time} bei ${horse}. Bis gleich! 🐴`;
  }
  if (daysUntil === 1) {
    return `Hallo ${name}, kurze Erinnerung: Morgen um ${time} komme ich zu ${horse}. Bis dann! 🐴`;
  }
  return `Hallo ${name}, nur zur Erinnerung: Am ${date} um ${time} bin ich bei ${horse}. 🐴`;
}

export function waTextReportReady(name: string, horse: string): string {
  return `Hallo ${name}, der Befundbericht für ${horse} ist fertig. 🐴`;
}

export function waTextInvoice(name: string, invoiceNumber: string, amount: string, dueDate?: string): string {
  let text = `Hallo ${name}, deine Rechnung Nr. ${invoiceNumber} über ${amount} ist bereit.`;
  if (dueDate) {
    text += ` Zahlbar bis ${dueDate}.`;
  }
  return text;
}

export function waTextLeadReply(name: string): string {
  return `Hallo ${name}, danke für deine Anfrage über Hufi! Ich würde mich gerne kurz mit dir abstimmen. Wann passt es dir? 🐴`;
}

export function waTextNextAppointment(name: string, horse: string): string {
  return `Hallo ${name}, alles erledigt bei ${horse} 🐴 Wann soll ich das nächste Mal vorbeikommen?`;
}

export function waTextPdfShare(name: string, horse: string, date: string): string {
  return `Hallo ${name}, anbei der Befundbericht für ${horse} vom ${date}. 🐴`;
}

export function waTextInvite(senderName: string): string {
  return `Hey! Ich nutze Hufi – das digitale Betriebssystem für die Pferdewelt 🐴\n\nPferdeakte, Termine, Dokumente – alles an einem Ort. Kostenlos starten:\nhttps://hufiapp.de/auth\n\nViele Grüße, ${senderName}`;
}

/**
 * Öffnet WhatsApp mit vorausgefülltem Text.
 * Wenn keine Telefonnummer vorhanden, wird null zurückgegeben.
 */
export function openWhatsApp(phone: string, text: string): void {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  const formatted = cleanPhone.startsWith("0") ? `49${cleanPhone.substring(1)}` : cleanPhone;
  window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
}

/**
 * Öffnet WhatsApp Share-Dialog ohne spezifische Nummer (zum Weiterleiten an beliebige Kontakte).
 */
export function shareViaWhatsApp(text: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
