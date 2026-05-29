-- BHS Balance FAQ-Einträge für HufiAI
-- Werden von Hufi geladen wenn Nutzer eine BHS-bezogene Frage stellt
INSERT INTO public.hufi_faq (category, question, answer, sort_order, active) VALUES

('BHS Balance', 'Was ist BHS Balance?',
'BHS Balance ist ein Hufpflege-Abo von Barhufservice Schmid. Du buchst einmal — und Pascal kommt in festem Rhythmus zu deinem Pferd. Kein Terminsuchen, feste Intervalle, alles digital dokumentiert.',
10, true),

('BHS Balance', 'Welche Intervalle gibt es beim BHS Balance Abo?',
'Es gibt drei Intervalle: alle 4 Wochen (für schnell wachsende Hufe), alle 6 Wochen (Standard) und alle 8 Wochen (langsam wachsende Hufe). Das passende Intervall besprichst du beim ersten Termin mit Pascal.',
20, true),

('BHS Balance', 'Was kostet das BHS Balance Abo?',
'Der Monatsbeitrag hängt von Intervall und Zone ab. 4 Wochen: Zone 1 = 71,10 €, Zone 2 = 87,48 €. 6 Wochen: Zone 1 = 53,44 €, Zone 2 = 60,56 €. 8 Wochen: Zone 1 = 41,56 €, Zone 2 = 47,10 €.',
30, true),

('BHS Balance', 'Was bedeuten Zone 1 und Zone 2?',
'Die Zone richtet sich nach dem Fahrtweg von Pascals Standort zu deinem Stall. Zone 1 = bis 25 km, Zone 2 = 25 bis 50 km. Zone 3 für Spezialtouren wird auf Anfrage vereinbart.',
40, true),

('BHS Balance', 'Wie kann ich das BHS Balance Abo kündigen?',
'Das Abo kann beidseitig jederzeit mit 4 Wochen Frist gekündigt werden — von dir oder von Pascal. Kündigung einfach über "Mein BHS Abo" in der App oder direkt per WhatsApp an Pascal.',
50, true),

('BHS Balance', 'Was passiert wenn mein Pferd kurzfristig nicht bearbeitet werden kann (Krankheit, Verletzung)?',
'Sprich Pascal direkt per WhatsApp an. Einzelne Termine können verschoben werden — das Abo läuft weiter, der Termin wird nachgeholt. Bei längerer Pause kann das Abo auf Wunsch pausiert werden.',
60, true),

('BHS Balance', 'Was ist Mehraufwand und was kostet er?',
'Mehraufwand entsteht bei stark überwachsenen Hufen (z.B. nach längerer Pause) oder bei der Erstbearbeitung eines neuen Pferdes. Pascal bespricht das vorher mit dir — es wird einmalig separat in Rechnung gestellt.',
70, true),

('BHS Balance', 'Bekomme ich als BHS Balance Kunde Zugang zur HufiApp?',
'Ja. Mit deinem BHS Balance Abo erhältst du automatisch einen kostenlosen Zugang zur HufiApp. Dort findest du die Pferdeakte deines Pferdes, die Pascal nach jedem Termin aktualisiert.',
80, true),

('BHS Balance', 'Was enthält die digitale Pferdeakte?',
'Die Pferdeakte zeigt alle vergangenen Termine, was bearbeitet wurde, besondere Befunde und Fotos der Hufe. So haben du und Pascal immer denselben Stand — und beim Tierarzt kannst du die Akte direkt vorzeigen.',
90, true),

('BHS Balance', 'Kann ich mehrere Pferde im BHS Balance Abo haben?',
'Ja. Jedes Pferd hat sein eigenes Abo mit eigenem Intervall und eigener Zone — die Konditionen können pro Pferd unterschiedlich sein. Schreib Pascal einfach an, er richtet das Abo für jedes Pferd einzeln ein.',
100, true);
