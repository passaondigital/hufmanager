import type { AutomationStep, TriggerType } from "./types";

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  badge: string;
  trigger_type: TriggerType;
  steps: AutomationStep[];
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "pferdeakte-onboarding",
    name: "Pferdeakte Onboarding",
    description: "5-E-Mail-Serie: Neue Kontakte zur Pferdeakte führen, Tresor aktivieren und Kompetenzteam einladen.",
    icon: "BookOpen",
    badge: "Lead-Magnet",
    trigger_type: "list_add",
    steps: [
      {
        id: "po-1",
        type: "email",
        subject: "Willkommen! Dein Pferd verdient eine digitale Akte 🐴",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h1 style="color:#F47B20;font-size:24px;">Die Digitale Pferdeakte</h1>
<p>Hallo {{vorname}},</p>
<p>stell dir vor, alle wichtigen Daten deines Pferdes – Hufbearbeitung, Tierarztberichte, Impfungen, Röntgenbilder – an <strong>einem sicheren Ort</strong>.</p>
<p>Das ist die Pferdeakte im HufManager. Kostenlos für dich als Pferdebesitzer.</p>
<ul>
<li>📋 Komplette Behandlungshistorie</li>
<li>📸 Fotos & Röntgenbilder sicher gespeichert</li>
<li>👥 Dein Kompetenzteam auf einen Blick</li>
</ul>
<a href="{{signup_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">Jetzt kostenlos registrieren →</a>
<p style="color:#666;font-size:13px;margin-top:24px;">Du erhältst diese E-Mail, weil du bei {{business_name}} als Kontakt gespeichert bist.</p>
</div>`,
      },
      { id: "po-2", type: "delay", delay_value: 2, delay_unit: "days" },
      {
        id: "po-3",
        type: "email",
        subject: "So legst du den ersten Eintrag in der Pferdeakte an",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Dein erster Schritt 🏇</h2>
<p>Hallo {{vorname}},</p>
<p>deine Pferdeakte wartet auf dich! In nur 2 Minuten ist alles eingerichtet:</p>
<ol>
<li><strong>Pferd anlegen</strong> – Name, Geburtsdatum, Rasse</li>
<li><strong>Foto hochladen</strong> – Damit du dein Pferd sofort erkennst</li>
<li><strong>Ersten Befund eintragen</strong> – Oder warte, bis dein Hufpfleger das für dich macht</li>
</ol>
<p>Das Beste: Dein Hufpfleger, Tierarzt und Therapeut können direkt in <em>deiner</em> Akte dokumentieren – du behältst immer die volle Kontrolle.</p>
<a href="{{app_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Pferdeakte öffnen →</a>
</div>`,
      },
      { id: "po-4", type: "delay", delay_value: 3, delay_unit: "days" },
      {
        id: "po-5",
        type: "email",
        subject: "Dein Pferde-Tresor: QR-Code, AKU-Mappe & mehr 🔐",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Der Tresor – Premium für dein Pferd</h2>
<p>Hallo {{vorname}},</p>
<p>wusstest du, dass du mit dem <strong>Tresor</strong> noch mehr aus deiner Pferdeakte herausholen kannst?</p>
<ul>
<li>🔒 <strong>Dokumenten-Safe</strong> – Equidenpass, Kaufvertrag, Versicherungen sicher ablegen</li>
<li>📱 <strong>QR-Code am Stall</strong> – Im Notfall sofort alle Infos parat</li>
<li>📋 <strong>AKU-Mappe</strong> – Alle Befunde auf einen Blick beim Pferdekauf</li>
<li>🔄 <strong>Besitzerwechsel</strong> – Nahtlose Übergabe aller Daten</li>
</ul>
<p><strong>Schon ab 2,99 €/Monat</strong> für bis zu 3 Pferde.</p>
<a href="{{tresor_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Tresor jetzt aktivieren →</a>
</div>`,
      },
      { id: "po-6", type: "delay", delay_value: 4, delay_unit: "days" },
      {
        id: "po-7",
        type: "email",
        subject: "Lade dein Kompetenzteam ein 👥",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Gemeinsam für dein Pferd</h2>
<p>Hallo {{vorname}},</p>
<p>die Pferdeakte wird erst richtig mächtig, wenn dein ganzes Team dabei ist:</p>
<ul>
<li>🦶 <strong>Hufpfleger/Schmied</strong> – Dokumentiert Befunde direkt in deiner Akte</li>
<li>🩺 <strong>Tierarzt</strong> – Röntgenbilder & Diagnosen an einem Ort</li>
<li>💆 <strong>Therapeut</strong> – Osteopathie, Physio & Co. lückenlos nachverfolgen</li>
</ul>
<p>Du entscheidest, wer was sehen darf – mit den <strong>Equid-Rights</strong> steuerst du jeden Zugriff granular.</p>
<a href="{{team_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Kompetenzteam einladen →</a>
</div>`,
      },
      { id: "po-8", type: "delay", delay_value: 5, delay_unit: "days" },
      {
        id: "po-9",
        type: "email",
        subject: "Empfiehl die Pferdeakte weiter & verdiene mit 💰",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Pferdeakte weiterempfehlen = Geld verdienen</h2>
<p>Hallo {{vorname}},</p>
<p>du findest die Pferdeakte gut? Dann verdiene damit!</p>
<p>Als <strong>Botschafter</strong> erhältst du:</p>
<ul>
<li>💰 <strong>20% Lifetime-Provision</strong> auf HufManager-Abos</li>
<li>💎 <strong>10% Lifetime-Provision</strong> auf Tresor-Abos</li>
<li>📈 Gamification von Bronze bis Platin mit steigenden Provisionen</li>
</ul>
<p>Einfach deinen persönlichen Link teilen – den Rest erledigt das System.</p>
<a href="{{botschafter_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Jetzt Botschafter werden →</a>
</div>`,
      },
    ],
  },
  {
    id: "tresor-upsell",
    name: "Tresor Upsell",
    description: "3-E-Mail-Serie: Bestehende Nutzer zum Tresor-Abo führen mit konkreten Vorteilen und Preisen.",
    icon: "Lock",
    badge: "Umsatz",
    trigger_type: "manual",
    steps: [
      {
        id: "tu-1",
        type: "email",
        subject: "Was passiert, wenn dein Pferd im Notfall keine Akte hat? 🚨",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Der Tresor schützt im Ernstfall</h2>
<p>Hallo {{vorname}},</p>
<p>Stell dir vor: Kolik am Wochenende. Der Nottierarzt braucht sofort alle Infos – Medikamente, Allergien, letzter Befund.</p>
<p>Mit dem <strong>QR-Code vom Tresor</strong> an der Box scannt der Tierarzt und hat <em>sofort</em> Zugriff auf alles Wichtige.</p>
<p>Ohne Tresor? Hektische Anrufe, fehlende Infos, wertvolle Zeit verloren.</p>
<a href="{{tresor_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Tresor entdecken →</a>
</div>`,
      },
      { id: "tu-2", type: "delay", delay_value: 3, delay_unit: "days" },
      {
        id: "tu-3",
        type: "email",
        subject: "QR-Code, AKU-Mappe, Dokumenten-Safe – alles in einem Abo",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Alles drin. Ab 2,99 €/Monat.</h2>
<p>Hallo {{vorname}},</p>
<p>Der Tresor ist das Premium-Upgrade für deine Pferdeakte:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#FFF3E6;"><td style="padding:8px;font-weight:bold;">LIGHT</td><td style="padding:8px;">1-3 Pferde</td><td style="padding:8px;font-weight:bold;">2,99 €/Monat</td></tr>
<tr><td style="padding:8px;font-weight:bold;">PRO ⭐</td><td style="padding:8px;">4-10 Pferde</td><td style="padding:8px;font-weight:bold;">7,99 €/Monat</td></tr>
<tr style="background:#FFF3E6;"><td style="padding:8px;font-weight:bold;">GESTÜT</td><td style="padding:8px;">11-50 Pferde</td><td style="padding:8px;font-weight:bold;">14,99 €/Monat</td></tr>
<tr><td style="padding:8px;font-weight:bold;">UNLIMITED</td><td style="padding:8px;">50+ Pferde</td><td style="padding:8px;font-weight:bold;">24,99 €/Monat</td></tr>
</table>
<p>Bei jährlicher Zahlung sparst du <strong>2 Monate</strong>.</p>
<a href="{{tresor_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Jetzt Tresor aktivieren →</a>
</div>`,
      },
      { id: "tu-4", type: "delay", delay_value: 5, delay_unit: "days" },
      {
        id: "tu-5",
        type: "email",
        subject: "Deine Daten bleiben 12 Monate – auch nach Kündigung ✅",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Kein Risiko. Volle Kontrolle.</h2>
<p>Hallo {{vorname}},</p>
<p>wir wissen, dass Abos manchmal Bauchschmerzen machen. Deshalb unser Versprechen:</p>
<ul>
<li>✅ <strong>Monatlich kündbar</strong> – Kein Vertrag, keine Mindestlaufzeit</li>
<li>✅ <strong>12 Monate Lesezugriff</strong> nach Kündigung</li>
<li>✅ <strong>Datenexport jederzeit</strong> möglich</li>
<li>✅ <strong>DSGVO-konform</strong> auf deutschen Servern</li>
</ul>
<p>Probier es einfach aus. Dein Pferd wird es dir danken.</p>
<a href="{{tresor_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Tresor jetzt starten →</a>
</div>`,
      },
    ],
  },
  {
    id: "botschafter-aktivierung",
    name: "Botschafter Aktivierung",
    description: "3-E-Mail-Serie: Kontakte zum Botschafter-Programm einladen mit Provisions-Rechner und Gamification.",
    icon: "Megaphone",
    badge: "Wachstum",
    trigger_type: "manual",
    steps: [
      {
        id: "ba-1",
        type: "email",
        subject: "Verdiene Geld mit dem, was du liebst: Pferden 🐎💰",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Das Botschafter-Programm</h2>
<p>Hallo {{vorname}},</p>
<p>du bist in der Pferdewelt zuhause? Dann verdiene damit!</p>
<p>Als <strong>HufManager-Botschafter</strong> empfiehlst du die Pferdeakte und den HufManager weiter – und verdienst bei jeder Anmeldung <strong>lebenslang</strong> mit.</p>
<ul>
<li>🎯 <strong>20% Lifetime-Provision</strong> auf HufManager-Abos</li>
<li>🎯 <strong>10% Lifetime-Provision</strong> auf Tresor-Abos</li>
<li>📊 Echtzeit-Dashboard mit Klicks & Conversions</li>
</ul>
<p>Egal ob du Influencer, Pferdeprofi oder Verband bist – es lohnt sich für jeden.</p>
<a href="{{botschafter_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Jetzt Botschafter werden →</a>
</div>`,
      },
      { id: "ba-2", type: "delay", delay_value: 3, delay_unit: "days" },
      {
        id: "ba-3",
        type: "email",
        subject: "So viel könntest du verdienen 📊 (Rechnung mit Zahlen)",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Lass uns rechnen</h2>
<p>Hallo {{vorname}},</p>
<p>Ein Beispiel: Du teilst deinen Link und <strong>10 Personen</strong> melden sich an.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<tr style="background:#FFF3E6;"><td style="padding:8px;">5x HufManager Starter (29€/Monat)</td><td style="padding:8px;font-weight:bold;">29 €/Monat für dich</td></tr>
<tr><td style="padding:8px;">3x Tresor PRO (7,99€/Monat)</td><td style="padding:8px;font-weight:bold;">2,40 €/Monat für dich</td></tr>
<tr style="background:#FFF3E6;"><td style="padding:8px;">2x HufManager Pro (49€/Monat)</td><td style="padding:8px;font-weight:bold;">19,60 €/Monat für dich</td></tr>
<tr style="background:#F47B20;color:white;"><td style="padding:8px;font-weight:bold;">GESAMT</td><td style="padding:8px;font-weight:bold;">= 51 €/Monat passiv</td></tr>
</table>
<p>Und das ist nur der Anfang. Mit dem <strong>Stufen-Modell</strong> (Bronze → Platin) steigen deine Provisionen auf bis zu 30%.</p>
<a href="{{botschafter_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Einnahmen-Rechner öffnen →</a>
</div>`,
      },
      { id: "ba-4", type: "delay", delay_value: 4, delay_unit: "days" },
      {
        id: "ba-5",
        type: "email",
        subject: "Dein persönlicher Empfehlungslink wartet ✨",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">In 60 Sekunden startklar</h2>
<p>Hallo {{vorname}},</p>
<p>die Anmeldung dauert keine Minute:</p>
<ol>
<li>Registrieren (Name, E-Mail, Typ wählen)</li>
<li>Persönlichen Link erhalten</li>
<li>Teilen – fertig!</li>
</ol>
<p>Du bekommst sofort Zugang zu:</p>
<ul>
<li>📊 Deinem Botschafter-Dashboard</li>
<li>🎨 Fertigen Werbemitteln & Vorlagen</li>
<li>📈 Echtzeit-Tracking aller Klicks & Conversions</li>
</ul>
<a href="{{botschafter_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Jetzt starten – kostenlos →</a>
</div>`,
      },
    ],
  },
  {
    id: "reaktivierung",
    name: "Reaktivierung",
    description: "3-E-Mail-Serie: Inaktive Nutzer zurückgewinnen mit emotionalem Ansatz und Feature-Updates.",
    icon: "RefreshCw",
    badge: "Retention",
    trigger_type: "manual",
    steps: [
      {
        id: "re-1",
        type: "email",
        subject: "Dein Pferd vermisst dich in der Pferdeakte 🐴❤️",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Wir vermissen dich!</h2>
<p>Hallo {{vorname}},</p>
<p>es ist eine Weile her, seit du in deiner Pferdeakte vorbeigeschaut hast.</p>
<p>In der Zwischenzeit hat sich einiges getan:</p>
<ul>
<li>📱 Neues mobiles Design – noch schneller am Stall</li>
<li>📸 Verbesserter Foto-Upload</li>
<li>🔔 Automatische Erinnerungen für Huftermine</li>
</ul>
<p>Dein Pferd verdient es, dass seine Gesundheitsdaten gepflegt werden. Schau vorbei!</p>
<a href="{{app_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Zurück zur Pferdeakte →</a>
</div>`,
      },
      { id: "re-2", type: "delay", delay_value: 5, delay_unit: "days" },
      {
        id: "re-3",
        type: "email",
        subject: "Neu: Diese Features kennst du noch nicht 🆕",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Was gibt's Neues?</h2>
<p>Hallo {{vorname}},</p>
<p>seit deinem letzten Besuch haben wir einiges gebaut:</p>
<ul>
<li>🗂️ <strong>Dokumenten-Tresor</strong> – Equidenpass & Co. sicher ablegen</li>
<li>📱 <strong>QR-Code</strong> – Im Notfall sofort alle Infos</li>
<li>👥 <strong>Kompetenzteam</strong> – Alle Profis deines Pferdes auf einen Blick</li>
<li>💊 <strong>Medikamenten-Tracker</strong> – Nie wieder einen Termin vergessen</li>
</ul>
<a href="{{app_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Jetzt entdecken →</a>
</div>`,
      },
      { id: "re-4", type: "delay", delay_value: 7, delay_unit: "days" },
      {
        id: "re-5",
        type: "email",
        subject: "Letzte Erinnerung: Deine Pferdeakte wartet 🕐",
        content_html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#F47B20;">Eine letzte Erinnerung</h2>
<p>Hallo {{vorname}},</p>
<p>wir möchten dich nicht nerven – das ist unsere letzte Nachricht dazu.</p>
<p>Aber denk dran: Eine lückenlose Dokumentation kann im Ernstfall den Unterschied machen. Bei einer Kolik, beim Pferdekauf, bei der Versicherung.</p>
<p>Deine Pferdeakte ist weiterhin kostenlos und jederzeit für dich da.</p>
<a href="{{app_link}}" style="display:inline-block;background:#F47B20;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Pferdeakte öffnen →</a>
<p style="color:#999;font-size:12px;margin-top:24px;">Du möchtest keine E-Mails mehr? <a href="{{unsubscribe_link}}" style="color:#999;">Hier abmelden</a></p>
</div>`,
      },
    ],
  },
];
