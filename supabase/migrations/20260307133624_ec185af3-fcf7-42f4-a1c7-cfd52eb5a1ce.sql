INSERT INTO contract_templates (
  name,
  type,
  plan,
  version,
  is_active,
  content_html,
  variables
) VALUES (
  'Nutzungsvertrag – HufManager 2026 v1.0',
  'nutzungsvertrag',
  'all',
  '1.0',
  true,
  '<div class="contract" style="font-family: ''Segoe UI'', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.6;">

<div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 30px; margin-bottom: 30px;">
  <h1 style="font-size: 28px; margin: 0 0 5px;">Nutzungsvertrag</h1>
  <p style="font-size: 16px; color: #4b5563; margin: 0;">HufManager – SaaS-Softwarelizenz</p>
  <p style="font-size: 13px; color: #9ca3af; margin: 5px 0 0;">Individualvertrag · Sondervereinbarung</p>
</div>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§1 Vertragspartner</h2>
<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #e5e7eb;">
      <strong>Anbieter</strong><br>
      Pascal Christian Schmid<br>HufManager<br>{{ANBIETER_ADRESSE}}<br>E-Mail: support@hufmanager.de<br>Tel: 0152 0900 7017
    </td>
    <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #e5e7eb;">
      <strong>Nutzer (Unternehmer)</strong><br>
      {{NUTZER_FIRMA}}<br>{{NUTZER_NAME}}<br>{{NUTZER_ADRESSE}}<br>E-Mail: {{NUTZER_EMAIL}}<br>Mobil: {{NUTZER_TELEFON}}
    </td>
  </tr>
</table>
<p style="font-size: 13px; color: #6b7280;">Beide Parteien handeln als Unternehmer im Sinne des §14 BGB.</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§2 Vertragsgegenstand</h2>
<p>Der Anbieter stellt dem Nutzer den Zugang zur webbasierten Softwarelösung „HufManager" im Paket <strong>{{PLAN_NAME}}</strong> zur beruflichen Nutzung zur Verfügung. Es handelt sich um eine zeitlich befristete Softwarelizenz (SaaS-Modell).</p>

<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
  <tr style="background: #f3f4f6;">
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Paket</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Preis/Monat</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Preis/Jahr (Regelpreis)</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Provider-ID</th>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #e5e7eb;">{{PLAN_NAME}}</td>
    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">{{PLAN_PREIS_MONAT}}</td>
    <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">{{PLAN_PREIS_JAHR}}</td>
    <td style="padding: 8px; border: 1px solid #e5e7eb;">{{PROVIDER_PID}}</td>
  </tr>
</table>

<div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
  <strong>Sondervereinbarung – Vertrauensbonus</strong> (gilt nur wenn ausgewiesen):<br>
  Bei jährlicher Vorauszahlung im 1. Vertragsjahr: Bonus von 2 Monatsbeiträgen.<br>
  → Vergütung im 1. Jahr: <strong>{{PREIS_JAHR_1}}</strong><br>
  → Ab dem 2. Vertragsjahr: <strong>{{PLAN_PREIS_JAHR}}</strong>
</div>

<div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
  <strong>Kleinunternehmerregelung gemäß §19 UStG:</strong><br>
  Auf alle Preise wird keine Umsatzsteuer erhoben und ausgewiesen. Alle Beträge sind Nettobeträge ohne Mehrwertsteuer.
</div>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§3 Leistungsumfang – Paket {{PLAN_NAME}}</h2>
<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
  <tr style="background: #f3f4f6;">
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Feature</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Enthalten</th>
  </tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Tages-Cockpit &amp; Tourenplanung</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_COCKPIT}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Turn-by-Turn Navigation (ORS, DSGVO-konform)</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_NAV}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Live-Spritpreise (Tankerkönig API)</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_SPRIT}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Automatisches Fahrtenbuch §6 EStG</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_FAHRTENBUCH}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Rechnungsstellung &amp; PDF-Export</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_RECHNUNGEN}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Digitale Pferdeakte &amp; HufCam Pro</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_PFERDEAKTE}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Kunden-App (kostenlos für Endkunden)</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">✅ inklusive</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">KI-Assistent Hufi &amp; AutoFlow</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_KI}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Team &amp; Mitarbeiterverwaltung</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_TEAM}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">HM Connect &amp; Fachpartner-Netzwerk</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{FEATURE_CONNECT}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Offline-Modus &amp; PWA</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">✅</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">DSGVO-konform, EU-Server (Frankfurt)</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">✅</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Pferde-Limit</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{PLAN_PFERDE_LIMIT}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Nutzer-Limit</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">{{PLAN_NUTZER_LIMIT}}</td></tr>
</table>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§4 Vertragslaufzeit und Verlängerung</h2>
<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; width: 40%;"><strong>Vertragsbeginn</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{VERTRAG_START}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Erstlaufzeit</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">12 Monate bis {{VERTRAG_ENDE}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Automatische Verlängerung</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">Jeweils 12 Monate</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Kündigungsfrist</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">30 Tage zum Ende der Laufzeit</td></tr>
</table>
<p style="font-size: 13px; color: #6b7280;">Eine Umstellung auf monatliche Zahlung ist per E-Mail (mit Provider-ID) an support@hufmanager.de möglich.</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§5 Vergütung und Zahlung</h2>
<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb; width: 40%;"><strong>Jahresgebühr 1. Vertragsjahr</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{PREIS_JAHR_1}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Zahlungsart</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{ZAHLUNGSART}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Zahlungseingang</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">{{ZAHLUNG_DATUM}}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>IBAN</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">DE66 2020 2080 0002 8383 704</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>BIC</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">SXPYDEHH</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Kontoinhaber</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">Pascal Christian Schmid</td></tr>
</table>
<div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
  Kein Mehrwertsteuerausweis gemäß §19 UStG.<br>
  Zugang wird nach Zahlungseingang freigeschaltet.<br>
  Bei Zahlungsverzug: Sperrung nach vorheriger Mahnung zulässig.
</div>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§6 Kündigung</h2>
<ul>
  <li>Schriftliche Kündigung (E-Mail) mit 30 Tagen Frist zum Laufzeitende.</li>
  <li>Kündigung an: support@hufmanager.de (mit Provider-ID und registrierter E-Mail).</li>
</ul>
<p>Bereits gezahlte Beträge werden nicht anteilig erstattet.</p>
<p>Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§7 Nutzungsrechte</h2>
<ul>
  <li>Einfaches, nicht übertragbares Nutzungsrecht für die Dauer des Vertrags.</li>
  <li>Zugangsdaten sind personenbezogen und nicht an Dritte weiterzugeben.</li>
  <li>Reverse Engineering, Vervielfältigung oder Weiterverkauf sind untersagt.</li>
  <li>Missbräuchliche Nutzung berechtigt zur fristlosen Sperrung.</li>
</ul>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§8 Verfügbarkeit</h2>
<p>Der Anbieter strebt eine Verfügbarkeit von 98% im Jahresmittel an. Ausgenommen sind Wartungszeiten, höhere Gewalt sowie Störungen außerhalb des Einflussbereichs des Anbieters.</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§9 Haftung</h2>
<ul>
  <li>Unbeschränkte Haftung bei Vorsatz, grober Fahrlässigkeit sowie Verletzung von Leben, Körper oder Gesundheit.</li>
  <li>Bei einfacher Fahrlässigkeit: Haftung nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren Schaden.</li>
  <li>Keine Haftung für mittelbare Schäden, entgangenen Gewinn oder Datenverluste ohne Vorsatz oder grobe Fahrlässigkeit.</li>
</ul>
<p>Der Nutzer ist für regelmäßige Datensicherungen verantwortlich.</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§10 Datenschutz und Auftragsverarbeitung</h2>
<p>Die Datenverarbeitung erfolgt gemäß DSGVO (EU 2016/679). Der Anbieter handelt als Auftragsverarbeiter gem. Art. 28 DSGVO. Der AVV ist Bestandteil dieses Vertrags und in der App abrufbar. Datenspeicherung ausschließlich auf EU-Servern (Frankfurt, Supabase SOC 2 Type II / ISO 27001).</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§11 Datenspeicherung und -löschung</h2>
<ul>
  <li>Nach Vertragsende: Deaktivierung des Zugangs.</li>
  <li>Rechnungsdaten: Aufbewahrung 10 Jahre gemäß §147 AO.</li>
  <li>Übrige Daten: Löschung nach Ablauf gesetzlicher Fristen.</li>
</ul>
<p>Nutzer ist verpflichtet, vor Vertragsende eigenständig Datensicherungen durchzuführen.</p>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">§12 Schlussbestimmungen</h2>
<ul>
  <li>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.</li>
  <li>Gerichtsstand ist – soweit gesetzlich zulässig – der Sitz des Anbieters.</li>
  <li>Änderungen oder Ergänzungen bedürfen der Textform.</li>
  <li>Salvatorische Klausel: Unwirksamkeit einzelner Bestimmungen berührt die Wirksamkeit der übrigen nicht.</li>
</ul>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Unterschriften</h2>
<p>Ort, Datum: _______________________________</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #e5e7eb;">
      <strong>Anbieter</strong><br>Pascal Christian Schmid<br>HufManager<br><br>___________________________<br>Unterschrift
    </td>
    <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #e5e7eb;">
      <strong>Nutzer</strong><br>{{NUTZER_NAME}}<br>{{NUTZER_FIRMA}}<br><br>___________________________<br>Unterschrift
    </td>
  </tr>
</table>

<h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Anhang A – Verfügbare Pakete (Stand 2026)</h2>
<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
  <tr style="background: #f3f4f6;">
    <th style="padding: 8px; border: 1px solid #e5e7eb;">Paket</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Preis/Monat</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">Preis/Jahr</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb;">Pferde</th>
    <th style="padding: 8px; border: 1px solid #e5e7eb;">Nutzer</th>
  </tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Starter</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">9,90 €</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">118,80 €</td><td style="padding: 8px; border: 1px solid #e5e7eb;">1–10</td><td style="padding: 8px; border: 1px solid #e5e7eb;">1</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Pro</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">29,00 €</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">348,00 €</td><td style="padding: 8px; border: 1px solid #e5e7eb;">11–75</td><td style="padding: 8px; border: 1px solid #e5e7eb;">1</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Duo</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">49,00 €</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">588,00 €</td><td style="padding: 8px; border: 1px solid #e5e7eb;">76–150</td><td style="padding: 8px; border: 1px solid #e5e7eb;">2</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Team</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">79,00 €</td><td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">948,00 €</td><td style="padding: 8px; border: 1px solid #e5e7eb;">151+</td><td style="padding: 8px; border: 1px solid #e5e7eb;">Unbegrenzt</td></tr>
</table>
<p style="font-size: 13px; color: #6b7280;">
  Alle Preise gemäß §19 UStG ohne Mehrwertsteuer.<br>
  Pferdebesitzer nutzen HufManager kostenlos.<br>
  14 Tage kostenlos testen · Monatlich kündbar · Keine Kreditkarte nötig.
</p>

<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
  HufManager · support@hufmanager.de · hufmanager.de<br>
  Dokument-Nr: {{VERTRAG_NR}} · Erstellt am: {{DATUM}}
</div>
</div>',
  '{
    "ANBIETER_ADRESSE": "Adresse folgt nach PostIdent",
    "PLAN_NAME": "",
    "PLAN_PREIS_MONAT": "",
    "PLAN_PREIS_JAHR": "",
    "PROVIDER_PID": "",
    "NUTZER_FIRMA": "",
    "NUTZER_NAME": "",
    "NUTZER_ADRESSE": "",
    "NUTZER_EMAIL": "",
    "NUTZER_TELEFON": "",
    "PREIS_JAHR_1": "",
    "VERTRAG_START": "",
    "VERTRAG_ENDE": "",
    "ZAHLUNGSART": "Überweisung",
    "ZAHLUNG_DATUM": "",
    "PLAN_PFERDE_LIMIT": "",
    "PLAN_NUTZER_LIMIT": "",
    "FEATURE_COCKPIT": "✅",
    "FEATURE_NAV": "✅",
    "FEATURE_SPRIT": "✅",
    "FEATURE_FAHRTENBUCH": "✅",
    "FEATURE_RECHNUNGEN": "✅",
    "FEATURE_PFERDEAKTE": "✅",
    "FEATURE_KI": "✅",
    "FEATURE_TEAM": "❌",
    "FEATURE_CONNECT": "✅",
    "VERTRAG_NR": "",
    "DATUM": ""
  }'::jsonb
);