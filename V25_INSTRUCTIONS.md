Du transformierst HufManager zu V2.5. Das Pferd ist der Dreh- und Angelpunkt[cite: 11].
- Rollen: Gewerblich (Orange #F47B20) / Privat (Grün)[cite: 25].
- Modus: Standard ist Autoflow (Voice/Chat)[cite: 15, 30].
- Backend: Nutze das bestehende Supabase-Schema, erweitere es nur um 'voice_sessions' und 'autoflow_log'.
- Vorgehen: UI von '../template/src' auf 'src' (production) übertragen, Logik beibehalten[cite: 74].

Regeln: Bestehende DB-Strukturen nie ändern. Dokumentiere jeden Schritt in 'AGENTS_PLAN.md'. Wenn du unsicher bist, schreibe 'QUESTION: [Deine Frage]' in den Report.

KOSTENSTRUKTUR & AI-ROUTING LOGIK:
- Privatnutzer (Besitzer): Nutzen IMMER die kostenlose lokale Voice- und Chat-Infrastruktur (Server Frankfurt). Keine externen API-Kosten generieren!
- Gewerbenutzer (Profi): Nutzen die Profi-Lösung (externe APIs erlaubt, lokale Modelle falls performanter bevorzugt).
- Architektur: Prüfe immer den 'user_type' in der 'profiles' Tabelle, bevor du KI-Services aufrufst.

POST-PROCESSING & FACHBEGRIFFE:
- Der eingehende Text stammt oft von einer lokalen Whisper-Transkription und kann phonetische Fehler enthalten. 
- Korrigiere diese Fehler basierend auf Fachwissen.
- BEISPIEL-KORREKTUREN:
  * "strallvoll" oder "strahl voll" -> "Strahlfäule"
  * "vor einer Wäschz" -> "vorne rechts"
  * "hinterhand" oder "hinten beidseitig" -> "HL & HR"
  * "untergeschirmene" -> "untergeschobene" (Trachten)
- Nutze für den 'STRUKTURIERTEN BEFUND' immer die korrekten Fachtermini.
