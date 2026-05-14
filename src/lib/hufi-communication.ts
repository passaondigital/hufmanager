export interface DraftMessage {
  type: "whatsapp" | "email";
  to: string;
  toName: string;
  subject?: string;
  body: string;
  deepLink: string;
}

function cleanPhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, "");
  if (p.startsWith("0")) p = "+49" + p.slice(1);
  if (!p.startsWith("+")) p = "+49" + p;
  return p.replace(/\+/g, "");
}

export function buildWhatsAppDraft(params: {
  phone: string;
  name: string;
  text: string;
}): DraftMessage {
  const cleaned = cleanPhone(params.phone);
  const encoded = encodeURIComponent(params.text);
  return {
    type: "whatsapp",
    to: params.phone,
    toName: params.name,
    body: params.text,
    deepLink: `https://wa.me/${cleaned}?text=${encoded}`,
  };
}

export function buildEmailDraft(params: {
  email: string;
  name: string;
  subject: string;
  body: string;
}): DraftMessage {
  const encoded = encodeURIComponent(params.body);
  const subj = encodeURIComponent(params.subject);
  return {
    type: "email",
    to: params.email,
    toName: params.name,
    subject: params.subject,
    body: params.body,
    deepLink: `mailto:${params.email}?subject=${subj}&body=${encoded}`,
  };
}

// Template-basiert, KEIN AI-Call für Standard-Nachrichten
export function generateAppointmentReminder(params: {
  clientName: string;
  horseName: string;
  date: string;
  time?: string;
  senderName?: string;
  formal?: boolean;
}): string {
  const anrede = params.formal ? `Sehr geehrte/r ${params.clientName}` : `Hallo ${params.clientName}`;
  const timeStr = params.time ? ` um ${params.time} Uhr` : "";
  const sender = params.senderName ?? "Ihr Hufpfleger";
  return `${anrede},\n\nichmal kurze Erinnerung an Ihren Termin für ${params.horseName} am ${params.date}${timeStr}.\n\nBitte melden Sie sich, falls Sie den Termin nicht wahrnehmen können.\n\nViele Grüße\n${sender}`;
}

export function generateInvoiceReminder(params: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  senderName?: string;
  formal?: boolean;
}): string {
  const anrede = params.formal ? `Sehr geehrte/r ${params.clientName}` : `Hallo ${params.clientName}`;
  const sender = params.senderName ?? "Ihr Hufpfleger";
  return `${anrede},\n\nals freundliche Erinnerung: Rechnung ${params.invoiceNumber} über ${params.amount.toFixed(2)} € ist seit ${params.dueDate} fällig.\n\nBitte prüfen Sie die Zahlung. Bei Fragen stehe ich gerne zur Verfügung.\n\nViele Grüße\n${sender}`;
}

export function generateNewAppointmentNotification(params: {
  clientName: string;
  horseName: string;
  date: string;
  time?: string;
  address?: string;
  senderName?: string;
}): string {
  const timeStr = params.time ? ` um ${params.time} Uhr` : "";
  const addrStr = params.address ? `\nAdresse: ${params.address}` : "";
  const sender = params.senderName ?? "Ihr Hufpfleger";
  return `Hallo ${params.clientName},\n\nnächster Termin für ${params.horseName}: ${params.date}${timeStr}.${addrStr}\n\nBis dann!\n${sender}`;
}

// Erkennt Intent aus Chat-Nachricht für Kommunikations-Anfragen
export function detectCommunicationIntent(text: string): "whatsapp" | "email" | "both" | null {
  const lower = text.toLowerCase();
  const hasWA = /whatsapp|wa\b|schreib.*nach/.test(lower);
  const hasEmail = /mail|email|e-mail/.test(lower);
  if (hasWA && hasEmail) return "both";
  if (hasWA) return "whatsapp";
  if (hasEmail) return "email";
  // "schreib [Name]" ohne Channel-Angabe → WhatsApp default
  if (/\b(schreib|erinner|informier|sag)\s+[A-ZÄÖÜ]/.test(text)) return "whatsapp";
  return null;
}
