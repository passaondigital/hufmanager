-- Migration: add_equine_ontology
-- Created: 2026-04-20
-- Purpose: Create equine_ontology lookup table with ~500 German equine/veterinary terms
--          for AI autoflow field routing, B2B reporting, and term recognition.

-- ============================================================
-- TABLE DEFINITION
-- ============================================================

CREATE TABLE IF NOT EXISTS equine_ontology (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  term           text        NOT NULL,
  aliases        text[]      DEFAULT '{}',
  category       text        NOT NULL CHECK (category IN (
                   'anatomie','pathologie','werkzeug','beschlag',
                   'diagnostik','medikation','haltung','biomechanik','fachbegriff'
                 )),
  tags           text[]      DEFAULT '{}',
  autoflow_field text,        -- which Autoflow/form field this term triggers
  autoflow_action text,       -- action to perform (e.g. 'activate_field', 'alert_provider')
  formal_term    text,        -- official veterinary / Latin term for B2B reports
  description    text,
  created_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS equine_ontology_term_idx
  ON equine_ontology (lower(term));

ALTER TABLE equine_ontology ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON equine_ontology FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS equine_ontology_category_idx
  ON equine_ontology (category);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO equine_ontology
  (term, aliases, category, tags, autoflow_field, autoflow_action, formal_term, description)
VALUES

-- ============================================================
-- ANATOMIE
-- ============================================================
('Hufbein',
  ARRAY['Coffin Bone','P3','Os pedis'],
  'anatomie', ARRAY['#Anatomie','#Röntgen'],
  'befund_allgemein', NULL,
  'Os pedis', 'Distales Zehenglied des Pferdes'),

('Strahlbein',
  ARRAY['Navicular Bone','Os naviculare'],
  'anatomie', ARRAY['#Anatomie','#Röntgen','#Navicular'],
  'navicular_befund', NULL,
  'Os naviculare distale', NULL),

('Kronbein',
  ARRAY['P2','Mittelglied'],
  'anatomie', ARRAY['#Anatomie'],
  'befund_allgemein', NULL,
  'Os coronae', NULL),

('Fesselbein',
  ARRAY['P1','Grundglied'],
  'anatomie', ARRAY['#Anatomie'],
  'befund_allgemein', NULL,
  'Os compedale', NULL),

('Hufgelenk',
  ARRAY['Distal Interphalangeal Joint','DIP'],
  'anatomie', ARRAY['#Anatomie','#Gelenk'],
  'gelenk_befund', NULL,
  'Articulatio interphalangea distalis', NULL),

('Hufrolle',
  ARRAY['Navicular apparatus'],
  'anatomie', ARRAY['#Anatomie','#Navicular'],
  'navicular_befund', NULL,
  'Apparatus podotrochlaris', NULL),

('Hufrollenapparat',
  ARRAY['Navicular apparatus','Hufrolle'],
  'anatomie', ARRAY['#Anatomie','#Navicular'],
  'navicular_befund', NULL,
  'Apparatus podotrochlaris', NULL),

('Tiefe Beugesehne',
  ARRAY['TBS','Deep Digital Flexor Tendon','DDFT'],
  'anatomie', ARRAY['#Anatomie','#Sehne'],
  'sehnen_befund', NULL,
  'Musculus flexor digitorum profundus', NULL),

('Oberflächliche Beugesehne',
  ARRAY['OBS','SDFT'],
  'anatomie', ARRAY['#Anatomie','#Sehne'],
  'sehnen_befund', NULL,
  'Musculus flexor digitorum superficialis', NULL),

('Fesselträger',
  ARRAY['Ligamentum suspensorium','Suspensory Ligament'],
  'anatomie', ARRAY['#Anatomie','#Band'],
  'sehnen_befund', NULL,
  'Musculus interosseus medius', NULL),

('Huflederhaut',
  ARRAY['Corium','Dermis'],
  'anatomie', ARRAY['#Anatomie','#Rehe'],
  'rehe_befund', NULL,
  'Corium ungulae', NULL),

('Weißlinie',
  ARRAY['White Line','Linea alba'],
  'anatomie', ARRAY['#Anatomie','#WLD'],
  'wld_befund', NULL,
  'Zona alba', NULL),

('Trachten',
  ARRAY['Heels','Trachtenhörner'],
  'anatomie', ARRAY['#Anatomie','#Balance'],
  'balance_befund', NULL,
  'Pars caudalis ungulae', NULL),

('Strahl',
  ARRAY['Frog','Cuneus ungulae'],
  'anatomie', ARRAY['#Anatomie','#Strahl'],
  'strahl_befund', NULL,
  'Cuneus ungulae', NULL),

('Sohle',
  ARRAY['Sole','Solea'],
  'anatomie', ARRAY['#Anatomie'],
  'sohlen_befund', NULL,
  'Solea ungulae', NULL),

('Hufwand',
  ARRAY['Hoof Wall','Paries ungulae'],
  'anatomie', ARRAY['#Anatomie'],
  'wand_befund', NULL,
  'Paries ungulae', NULL),

('Kronrand',
  ARRAY['Coronet','Limbus'],
  'anatomie', ARRAY['#Anatomie'],
  'befund_allgemein', NULL,
  'Limbus ungulae', NULL),

('Ballentracht',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Balance'],
  'balance_befund', NULL,
  NULL, NULL),

('Zehentracht',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Balance'],
  'balance_befund', NULL,
  NULL, NULL),

('Hufknorpel',
  ARRAY['Seitenknorpel','Cartilago ungulae'],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Cartilago ungulae', NULL),

('Synovialscheide',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Gelenk'],
  NULL, NULL,
  'Vagina synovialis', NULL),

('Hufgelenkskapsel',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Gelenk'],
  NULL, NULL,
  'Capsula articularis', NULL),

('Kronbeingelenk',
  ARRAY['PIP','Proximales Interphalangealgelenk'],
  'anatomie', ARRAY['#Anatomie','#Gelenk'],
  NULL, NULL,
  'Articulatio interphalangea proximalis', NULL),

('Fesselgelenk',
  ARRAY['Fetlock','MCP'],
  'anatomie', ARRAY['#Anatomie','#Gelenk'],
  NULL, NULL,
  'Articulatio metacarpophalangea', NULL),

('Sprunggelenk',
  ARRAY['Tarsus','Hock'],
  'anatomie', ARRAY['#Anatomie','#Gelenk'],
  NULL, NULL,
  'Articulatio tarsocruralis', NULL),

('Strecksehne',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Sehne'],
  NULL, NULL,
  'Tendo extensorius', NULL),

('Perioplon',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Perioplon', NULL),

('Hornwand',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Paries corneus', NULL),

('Röhrenhorn',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Tubuli cornei', NULL),

('Blättchenhorn',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Rehe'],
  NULL, NULL,
  'Lamellae cornifieae', NULL),

('Eckstreben',
  ARRAY['Bars'],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Columnae', NULL),

('Randsaum',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Margo ungulae', NULL),

('Hufrollenschleimbeutel',
  ARRAY['Navicular bursa','Bursa podotrochlearis'],
  'anatomie', ARRAY['#Anatomie','#Navicular'],
  NULL, NULL,
  'Bursa podotrochlearis', NULL),

('Hufrollenband',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Navicular'],
  NULL, NULL,
  'Ligamentum sesamoideum', NULL),

('Palmares Annularband',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie','#Band'],
  NULL, NULL,
  'Ligamentum anulare palmare', NULL),

('Karpalkanal',
  ARRAY[]::text[],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Canalis carpalis', NULL),

('Griffelbein',
  ARRAY['Splint bone','Os metacarpi'],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Os metacarpi secundum/quartum', NULL),

('Röhrbein',
  ARRAY['Cannon bone','Os metacarpi III'],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Os metacarpi tertium', NULL),

('Sesambein',
  ARRAY['Sesamoid'],
  'anatomie', ARRAY['#Anatomie'],
  NULL, NULL,
  'Os sesamoideum proximale', NULL),

-- ============================================================
-- PATHOLOGIE
-- ============================================================
('Hufrehe',
  ARRAY['Rehe','Laminitis'],
  'pathologie', ARRAY['#Befund','#Notfall','#Chronisch','#B2B_Abrechnung'],
  'rehe_befund', 'activate_rehe_protocol',
  'Laminitis ungulae', NULL),

('Akute Rehe',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Notfall'],
  'rehe_befund', 'alert_provider',
  'Laminitis acuta', NULL),

('Chronische Rehe',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Chronisch'],
  'rehe_befund', NULL,
  'Laminitis chronica', NULL),

('Rotationsrehe',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'rehe_befund', 'activate_rehe_protocol',
  'Laminitis cum rotatione', NULL),

('Sinkenrehe',
  ARRAY['Hufbeinsenkung'],
  'pathologie', ARRAY['#Befund','#Röntgen','#Notfall'],
  'rehe_befund', 'alert_provider',
  'Laminitis cum descensu', NULL),

('Hufbeinsenkung',
  ARRAY['Pedal Bone Sinking','Sinken'],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'rehe_befund', 'activate_rehe_protocol',
  'Descensus ossis pedis', NULL),

('Hufbeinrotation',
  ARRAY['Pedal Bone Rotation'],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'rehe_befund', NULL,
  'Rotatio ossis pedis', NULL),

('WLD',
  ARRAY['White Line Disease','Weißlinienentzündung','Seedy Toe'],
  'pathologie', ARRAY['#Befund','#WLD'],
  'wld_befund', 'activate_wld_protocol',
  'Morbus lineae albae', NULL),

('Weißlinienentzündung',
  ARRAY['White Line Disease','Seedy Toe'],
  'pathologie', ARRAY['#Befund','#WLD'],
  'wld_befund', NULL,
  'Onychomycosis', NULL),

('Strahlfäule',
  ARRAY['Thrush','Strahlkrebs Grad I'],
  'pathologie', ARRAY['#Befund','#Strahl','#B2B_Abrechnung'],
  'strahl_befund', 'activate_strahl_protocol',
  'Pododermatitis superficialis cunei', NULL),

('Strahlkrebs',
  ARRAY['Canker','Pododermatitis'],
  'pathologie', ARRAY['#Befund','#Strahl','#Notfall'],
  'strahl_befund', 'alert_provider',
  'Pododermatitis chronica hypertrophicans', NULL),

('Hufabszess',
  ARRAY['Abszess','Hoof Abscess'],
  'pathologie', ARRAY['#Befund','#Notfall'],
  'befund_allgemein', 'alert_provider',
  'Abscessus ungulae', NULL),

('Sohlenabszess',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Notfall'],
  'sohlen_befund', 'alert_provider',
  'Abscessus soleae', NULL),

('Wandabszess',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund'],
  'wand_befund', NULL,
  'Abscessus parietis ungulae', NULL),

('Hufgeschwür',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Notfall'],
  'befund_allgemein', NULL,
  'Ulcus ungulae', NULL),

('Bockhuf',
  ARRAY['Club Foot','Steiler Huf'],
  'pathologie', ARRAY['#Befund','#Chronisch','#Biomechanik'],
  'balance_befund', 'activate_korrekturbeschlag',
  'Pes equinus', NULL),

('Wandriss',
  ARRAY['Hornspalte','Wall Crack'],
  'pathologie', ARRAY['#Befund','#Wand'],
  'wand_befund', NULL,
  'Fissura parietis ungulae', NULL),

('Zehenwandriss',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Wand'],
  'wand_befund', NULL,
  'Fissura zonae dorsalis', NULL),

('Trachtenriss',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Wand'],
  'wand_befund', NULL,
  'Fissura zonae caudalis', NULL),

('Querriß',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Wand'],
  'wand_befund', NULL,
  'Fissura transversa', NULL),

('Wachstumsringe',
  ARRAY['Growth Rings','Reheringe'],
  'pathologie', ARRAY['#Befund','#Rehe'],
  'wand_befund', NULL,
  'Anuli cornei', NULL),

('Reheringe',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Rehe'],
  'rehe_befund', NULL,
  'Anuli laminitici', NULL),

('Ballenenge',
  ARRAY['Contracted Heels'],
  'pathologie', ARRAY['#Befund','#Balance'],
  'balance_befund', NULL,
  'Contractura talonorum', NULL),

('Trachtenenge',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Balance'],
  'balance_befund', NULL,
  'Stenosis talonorum', NULL),

('Vollhuf',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Balance'],
  'balance_befund', NULL,
  'Hoof contraction', NULL),

('Sohlenquetschung',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Sohle'],
  'sohlen_befund', NULL,
  'Contusio soleae', NULL),

('Druckbrand',
  ARRAY['Druckstelle'],
  'pathologie', ARRAY['#Befund','#Beschlag'],
  'beschlag_befund', NULL,
  'Necrosis a pressione', NULL),

('Hufknorpelverknöcherung',
  ARRAY['Sidebone'],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'roentgen_befund', NULL,
  'Ossificatio cartilaginum ungulae', NULL),

('Spat',
  ARRAY['Spavin'],
  'pathologie', ARRAY['#Befund','#Röntgen','#Chronisch'],
  'gelenk_befund', NULL,
  'Osteitis tarsalis', NULL),

('Schale',
  ARRAY['Ringbone'],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'gelenk_befund', NULL,
  'Periostitis phalangis', NULL),

('Niedrige Schale',
  ARRAY['Low Ringbone'],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'gelenk_befund', NULL,
  'Low ringbone', NULL),

('Hohe Schale',
  ARRAY['High Ringbone'],
  'pathologie', ARRAY['#Befund','#Röntgen'],
  'gelenk_befund', NULL,
  'High ringbone', NULL),

('Fesselträgerschaden',
  ARRAY['Fesselträgerdesmopathie','Suspensory Desmitis'],
  'pathologie', ARRAY['#Befund','#Sehne','#Chronisch'],
  'sehnen_befund', 'activate_sehnen_protocol',
  'Desmitis ligamenti suspensorii', NULL),

('Fesselträgerdesmopathie',
  ARRAY['Suspensory Desmitis'],
  'pathologie', ARRAY['#Befund','#Sehne','#Chronisch'],
  'sehnen_befund', NULL,
  'Desmitis ligamenti suspensorii', NULL),

('Insertionsdesmopathie',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Sehne'],
  'sehnen_befund', NULL,
  'Desmopathia insertionalis', NULL),

('TBS-Schaden',
  ARRAY['Tiefer-Beugesehnen-Schaden'],
  'pathologie', ARRAY['#Befund','#Sehne'],
  'sehnen_befund', NULL,
  'Tendopathia flexoris digitorum profundi', NULL),

('Sehnenscheidenerguss',
  ARRAY['Gumpe','Windgalle'],
  'pathologie', ARRAY['#Befund','#Sehne'],
  'sehnen_befund', NULL,
  'Effusio vaginae synovialis', NULL),

('Navicular Syndrom',
  ARRAY['Podotrochlose','Strahlbeinlahmheit','Navicular Disease'],
  'pathologie', ARRAY['#Befund','#Navicular','#Chronisch','#B2B_Abrechnung'],
  'navicular_befund', NULL,
  'Podotrochlosis', NULL),

('Podotrochlose',
  ARRAY['Navicular Disease','Strahlbeinlahmheit'],
  'pathologie', ARRAY['#Befund','#Navicular','#Chronisch'],
  'navicular_befund', NULL,
  'Podotrochlosis', NULL),

('Hufrollenentzündung',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Navicular'],
  'navicular_befund', NULL,
  'Podotrochlitis', NULL),

('Podotrochlitis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Navicular'],
  'navicular_befund', NULL,
  'Podotrochlitis', NULL),

('Lahmheit',
  ARRAY['Lameness','Hinken'],
  'pathologie', ARRAY['#Befund','#Lahmheit'],
  'lahmheits_befund', 'activate_lahmheit_protocol',
  'Claudicatio', NULL),

('Stützbeinlahmheit',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Lahmheit'],
  'lahmheits_befund', NULL,
  'Claudicatio membri sustentantis', NULL),

('Hangbeinlahmheit',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Lahmheit'],
  'lahmheits_befund', NULL,
  'Claudicatio membri pendentis', NULL),

('Kolik',
  ARRAY['Colic'],
  'pathologie', ARRAY['#Befund','#Notfall','#Tierarzt'],
  'allgemein_befund', 'alert_provider',
  'Colica equi', NULL),

('Cushing-Syndrom',
  ARRAY['PPID','Hypophysen-Adenom'],
  'pathologie', ARRAY['#Befund','#Chronisch','#EMS'],
  'allgemein_befund', NULL,
  'Pituitary Pars Intermedia Dysfunction', NULL),

('PPID',
  ARRAY['Cushing-Syndrom','Hypophysen-Adenom'],
  'pathologie', ARRAY['#Befund','#Chronisch','#EMS'],
  'allgemein_befund', NULL,
  'Pituitary Pars Intermedia Dysfunction', NULL),

('EMS',
  ARRAY['Equines Metabolisches Syndrom','Insulinresistenz'],
  'pathologie', ARRAY['#Befund','#Chronisch','#Ernährung'],
  'allgemein_befund', NULL,
  'Equine Metabolic Syndrome', NULL),

('Insulinresistenz',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#EMS','#Ernährung'],
  'allgemein_befund', NULL,
  'Insulinresistentia', NULL),

('Mauke',
  ARRAY['Mud Fever','Scratches','Kronranddermatitis'],
  'pathologie', ARRAY['#Befund','#Haut'],
  'befund_allgemein', NULL,
  'Dermatitis chronica crustosa', NULL),

('Kronranddermatitis',
  ARRAY['Mud Fever','Mauke'],
  'pathologie', ARRAY['#Befund','#Haut'],
  'befund_allgemein', NULL,
  'Dermatitis chronica crustosa', NULL),

('Arthrose',
  ARRAY['OA','Osteoarthritis'],
  'pathologie', ARRAY['#Befund','#Chronisch','#Röntgen'],
  'gelenk_befund', NULL,
  'Arthrosis deformans', NULL),

('Arthritis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Notfall','#Gelenk'],
  'gelenk_befund', NULL,
  'Arthritis', NULL),

('Synovitis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Gelenk'],
  'gelenk_befund', NULL,
  'Synovitis', NULL),

('Osteochondrose',
  ARRAY['OC','OCD'],
  'pathologie', ARRAY['#Befund','#Röntgen','#Juvenil'],
  'gelenk_befund', NULL,
  'Osteochondrosis dissecans', NULL),

('Periostitis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund'],
  'befund_allgemein', NULL,
  'Periostitis', NULL),

('Sesamitis',
  ARRAY['Sesamoiditis'],
  'pathologie', ARRAY['#Befund'],
  'befund_allgemein', NULL,
  'Sesamitis', NULL),

('Bursitis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund'],
  'befund_allgemein', NULL,
  'Bursitis', NULL),

('Desmitis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Band'],
  'sehnen_befund', NULL,
  'Desmitis', NULL),

('Tendovaginitis',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Sehne'],
  'sehnen_befund', NULL,
  'Tendovaginitis', NULL),

('Rhabdomyolyse',
  ARRAY['Tying Up','Kreuzverschlag'],
  'pathologie', ARRAY['#Befund','#Notfall'],
  'allgemein_befund', NULL,
  'Rhabdomyolysis', NULL),

('Anhydrosis',
  ARRAY['Nichtschwitzer'],
  'pathologie', ARRAY['#Befund'],
  'allgemein_befund', NULL,
  'Anhydrosis', NULL),

('Strahlentzündung',
  ARRAY[]::text[],
  'pathologie', ARRAY['#Befund','#Strahl'],
  'strahl_befund', NULL,
  'Pododermatitis cunei', NULL),

-- ============================================================
-- BESCHLAG
-- ============================================================
('Normalbeschlag',
  ARRAY['Standard Beschlag'],
  'beschlag', ARRAY['#Beschlag','#B2B_Abrechnung'],
  'beschlag_typ', NULL,
  'Ferratura normalis', NULL),

('NBS-Beschlag',
  ARRAY['Navicular Beschlag System','Natural Balance Shoe'],
  'beschlag', ARRAY['#Beschlag','#Navicular','#Orthopädie'],
  'beschlag_typ', NULL,
  'Ferratura podotrochlaris', NULL),

('Korrekturbeschlag',
  ARRAY['Therapeutischer Beschlag'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie','#B2B_Abrechnung'],
  'beschlag_typ', 'activate_korrekturbeschlag',
  'Ferratura correctiva', NULL),

('Keilbeschlag',
  ARRAY['Keileinlage'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'beschlag_typ', NULL,
  'Ferratura cunei', NULL),

('Zehenaufzug',
  ARRAY['Aufzug','Rolled Toe'],
  'beschlag', ARRAY['#Beschlag','#Biomechanik'],
  'beschlag_detail', NULL,
  'Processus ascendens zonal', NULL),

('Eggbar-Eisen',
  ARRAY['Egg Bar Shoe','Eierstab'],
  'beschlag', ARRAY['#Beschlag','#Navicular','#Rehe'],
  'beschlag_typ', NULL,
  'Ferratura ovalis', NULL),

('Stegeisen',
  ARRAY['Bar Shoe','Vollsteg'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'beschlag_typ', NULL,
  'Ferratura cum ponte', NULL),

('Halbsteg',
  ARRAY[]::text[],
  'beschlag', ARRAY['#Beschlag'],
  'beschlag_detail', NULL,
  'Ferratura semiponte', NULL),

('Klebebeschlag',
  ARRAY['Glue-On','Kunstharz-Beschlag'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'beschlag_typ', NULL,
  'Ferratura glutinata', NULL),

('Barhuf',
  ARRAY['Barefoot','Unbeschlagen'],
  'beschlag', ARRAY['#Beschlag','#Haltung'],
  'beschlag_typ', NULL,
  'Pes discalceatus', NULL),

('Barhuf-Trim',
  ARRAY['Natural Trim','Barefoot Trim'],
  'beschlag', ARRAY['#Beschlag','#Haltung'],
  'beschlag_typ', NULL,
  'Correctura pedum discalceatorum', NULL),

('Hufschuhe',
  ARRAY['Hoof Boots','Easyboots'],
  'beschlag', ARRAY['#Beschlag','#Haltung'],
  'beschlag_typ', NULL,
  'Calcei ungulae', NULL),

('Beschnitt',
  ARRAY['Trimming','Trim'],
  'beschlag', ARRAY['#Beschlag','#B2B_Abrechnung'],
  'massnahme', NULL,
  'Trimma', NULL),

('Warm-Beschlag',
  ARRAY[]::text[],
  'beschlag', ARRAY['#Beschlag','#Werkzeug'],
  'beschlag_methode', NULL,
  'Ferratura cum igne', NULL),

('Kalt-Beschlag',
  ARRAY[]::text[],
  'beschlag', ARRAY['#Beschlag','#Werkzeug'],
  'beschlag_methode', NULL,
  'Ferratura frigida', NULL),

('Trachtenerhöhung',
  ARRAY['Heel Wedge'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'beschlag_detail', NULL,
  'Elevatio talonorum', NULL),

('Trachtenabsenkung',
  ARRAY[]::text[],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'beschlag_detail', NULL,
  'Reductio talonorum', NULL),

('Schutzplatte',
  ARRAY['Sohlenplatte','Sole Pad'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'beschlag_detail', NULL,
  'Lamina protectrix', NULL),

('Polyurethan-Huf',
  ARRAY['Kunsthuf','Equilox'],
  'beschlag', ARRAY['#Beschlag','#Orthopädie'],
  'massnahme', NULL,
  'Ungula artificialis polyurethanica', NULL),

('Rekonstruktionshuf',
  ARRAY['Aufbauhuf'],
  'beschlag', ARRAY['#Beschlag','#WLD','#Rehe'],
  'massnahme', NULL,
  'Ungula reconstructa', NULL),

('GE-Beschlag',
  ARRAY['Graduated Extension'],
  'beschlag', ARRAY['#Beschlag','#Biomechanik'],
  'beschlag_typ', NULL,
  'Ferratura gradiente extensionis', NULL),

('Herzhuf-Eisen',
  ARRAY['Heart Bar Shoe'],
  'beschlag', ARRAY['#Beschlag','#Rehe'],
  'beschlag_typ', NULL,
  'Ferratura cordiformis', NULL),

('Rektifikationsschnitt',
  ARRAY[]::text[],
  'beschlag', ARRAY['#Beschlag','#Biomechanik'],
  'beschlag_detail', NULL,
  NULL, NULL),

('Sitzbeschlag',
  ARRAY['Seated Out'],
  'beschlag', ARRAY['#Beschlag'],
  'beschlag_detail', NULL,
  NULL, NULL),

('Aufzugsmaschine',
  ARRAY[]::text[],
  'beschlag', ARRAY['#Werkzeug','#Beschlag'],
  NULL, NULL,
  NULL, NULL),

-- ============================================================
-- WERKZEUG
-- ============================================================
('Hufmesser',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Scalpellum ungulae', NULL),

('Hufkratzer',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Mundator ungulae', NULL),

('Hufzange',
  ARRAY['Hoof Nipper'],
  'werkzeug', ARRAY['#Werkzeug','#Diagnostik'],
  NULL, NULL,
  'Forceps ungulae', NULL),

('Raspe',
  ARRAY['Hoof Rasp'],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Lima ungulae', NULL),

('Hufhammer',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Malleus ferrarius', NULL),

('Nietzange',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Forceps clavorum', NULL),

('Vorschlag',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Malleolus', NULL),

('Amboss',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Incus ferraria', NULL),

('Hufblock',
  ARRAY['Hoof Stand'],
  'werkzeug', ARRAY['#Werkzeug'],
  NULL, NULL,
  'Sustentaculum ungulae', NULL),

('Winkelmesser',
  ARRAY['Hoof Gauge'],
  'werkzeug', ARRAY['#Werkzeug','#Diagnostik'],
  NULL, NULL,
  'Goniometer', NULL),

('Hufzangenprobe',
  ARRAY['Pincer Test','Zangenprobe'],
  'werkzeug', ARRAY['#Diagnostik'],
  'diagnostik_befund', NULL,
  'Probatio forcipis ungulae', NULL),

('Hufthermometer',
  ARRAY[]::text[],
  'werkzeug', ARRAY['#Werkzeug','#Diagnostik'],
  NULL, NULL,
  'Thermometrum ungulae', NULL),

('Druckmessplatte',
  ARRAY['Force Plate'],
  'werkzeug', ARRAY['#Werkzeug','#Diagnostik','#Biomechanik'],
  NULL, NULL,
  'Planta pressoria', NULL),

-- ============================================================
-- DIAGNOSTIK
-- ============================================================
('Beugeprobe',
  ARRAY['Flexion Test','Biegeprobe'],
  'diagnostik', ARRAY['#Diagnostik','#Lahmheit'],
  'diagnostik_befund', NULL,
  'Probatio flexionis', NULL),

('Keilprobe',
  ARRAY['Wedge Test'],
  'diagnostik', ARRAY['#Diagnostik','#Lahmheit'],
  'diagnostik_befund', NULL,
  'Probatio cuneiformis', NULL),

('Lahmheitsuntersuchung',
  ARRAY['Lameness Exam'],
  'diagnostik', ARRAY['#Diagnostik','#B2B_Abrechnung'],
  'diagnostik_befund', 'activate_lahmheit_protocol',
  'Examinatio claudicationis', NULL),

('Palpation',
  ARRAY[]::text[],
  'diagnostik', ARRAY['#Diagnostik'],
  'diagnostik_befund', NULL,
  'Palpatio', NULL),

('Dorsopalmares Röntgen',
  ARRAY['DP-Aufnahme','Dorsopalmarer Strahlengang'],
  'diagnostik', ARRAY['#Diagnostik','#Röntgen'],
  'roentgen_befund', NULL,
  'Radiographia dorsopalmarica', NULL),

('Laterales Röntgen',
  ARRAY['LM-Aufnahme'],
  'diagnostik', ARRAY['#Diagnostik','#Röntgen'],
  'roentgen_befund', NULL,
  'Radiographia lateralis', NULL),

('Leitungsanästhesie',
  ARRAY['Nerve Block','Nervenblock'],
  'diagnostik', ARRAY['#Diagnostik','#Tierarzt'],
  'diagnostik_befund', NULL,
  'Anaesthesia conductionis', NULL),

('Zehennervenblock',
  ARRAY['PDN Block','Palmar Digital Nerve Block'],
  'diagnostik', ARRAY['#Diagnostik','#Tierarzt'],
  'diagnostik_befund', NULL,
  'Blockadio nervorum digitalium palmarum', NULL),

('Tiefer Zehennervenblock',
  ARRAY['Low 4-Point Block'],
  'diagnostik', ARRAY['#Diagnostik','#Tierarzt'],
  'diagnostik_befund', NULL,
  'Blockadio nervorum digitalium distalis', NULL),

('Gelenkinjektion',
  ARRAY['Intraartikuläre Injektion','IA-Injektion'],
  'diagnostik', ARRAY['#Diagnostik','#Tierarzt','#B2B_Abrechnung'],
  'massnahme', NULL,
  'Injectio intraarticularils', NULL),

('Synovia-Analyse',
  ARRAY['Gelenkpunktion','Synoviocentese'],
  'diagnostik', ARRAY['#Diagnostik','#Tierarzt'],
  'diagnostik_befund', NULL,
  'Analysis synoviae', NULL),

('Ultraschall',
  ARRAY['Sonographie','US'],
  'diagnostik', ARRAY['#Diagnostik','#Röntgen'],
  'roentgen_befund', NULL,
  'Sonographia', NULL),

('MRT',
  ARRAY['Magnetresonanztomographie','MRI'],
  'diagnostik', ARRAY['#Diagnostik','#Röntgen','#B2B'],
  'roentgen_befund', NULL,
  'Imagines resonantiae magneticae', NULL),

('CT',
  ARRAY['Computertomographie'],
  'diagnostik', ARRAY['#Diagnostik','#Röntgen'],
  'roentgen_befund', NULL,
  'Tomographia computatoria', NULL),

('Szintigraphie',
  ARRAY['Nuclear Scintigraphy','Knochenszintigraphie'],
  'diagnostik', ARRAY['#Diagnostik','#Röntgen'],
  'roentgen_befund', NULL,
  'Scintigraphia', NULL),

('Ganganalyse',
  ARRAY['Gangbild','Gangbild-Analyse'],
  'diagnostik', ARRAY['#Diagnostik','#Biomechanik'],
  'diagnostik_befund', NULL,
  'Analysis gressus', NULL),

('Pulsation',
  ARRAY['Digitale Pulsation','Pulsmessung Fessel'],
  'diagnostik', ARRAY['#Diagnostik','#Rehe'],
  'rehe_befund', NULL,
  'Pulsatio arteriae digitalis', NULL),

('Huftemperatur',
  ARRAY[]::text[],
  'diagnostik', ARRAY['#Diagnostik','#Rehe'],
  'rehe_befund', NULL,
  'Temperatura ungulae', NULL),

('Lahmheitsgrad',
  ARRAY['Lahmheitsgrade I-V','AAEP Grad'],
  'diagnostik', ARRAY['#Diagnostik','#Lahmheit'],
  'lahmheits_befund', NULL,
  'Gradus claudicationis', NULL),

('Druckschmerz',
  ARRAY[]::text[],
  'diagnostik', ARRAY['#Diagnostik'],
  'diagnostik_befund', NULL,
  'Dolor a pressione', NULL),

('Klopfschmerz',
  ARRAY['Perkussion'],
  'diagnostik', ARRAY['#Diagnostik'],
  'diagnostik_befund', NULL,
  'Dolor a percussione', NULL),

('Stichtest',
  ARRAY['Probe-Eröffnung'],
  'diagnostik', ARRAY['#Diagnostik','#Abszess'],
  'diagnostik_befund', NULL,
  'Test punctorius', NULL),

('Vitalitätstest',
  ARRAY[]::text[],
  'diagnostik', ARRAY['#Diagnostik'],
  'diagnostik_befund', NULL,
  NULL, NULL),

-- ============================================================
-- MEDIKATION
-- ============================================================
('Phenylbutazon',
  ARRAY['Bute','Phenylbuta'],
  'medikation', ARRAY['#Medikation','#NSAID','#Tierarzt'],
  'medikation', NULL,
  'Phenylbutazonum', NULL),

('Flunixin-Meglumin',
  ARRAY['Finadyne','Flunixin'],
  'medikation', ARRAY['#Medikation','#NSAID','#Tierarzt'],
  'medikation', NULL,
  'Flunixinum megluminum', NULL),

('Meloxicam',
  ARRAY['Metacam'],
  'medikation', ARRAY['#Medikation','#NSAID','#Tierarzt'],
  'medikation', NULL,
  'Meloxicamum', NULL),

('Hyaluronsäure',
  ARRAY['HA','Hyaluron','Hylartil'],
  'medikation', ARRAY['#Medikation','#Gelenk','#Tierarzt'],
  'medikation', NULL,
  'Acidum hyaluronicum', NULL),

('PRP',
  ARRAY['Platelet Rich Plasma','Eigenblut'],
  'medikation', ARRAY['#Medikation','#Regeneration'],
  'massnahme', NULL,
  'Plasma thrombocytibus dives', NULL),

('IRAP',
  ARRAY['Interleukin-1 Rezeptorantagonist Protein'],
  'medikation', ARRAY['#Medikation','#Gelenk'],
  'massnahme', NULL,
  'Proteinum antagonistae receptori interleucini-1', NULL),

('Kortison',
  ARRAY['Kortikosteroide','Corticosteroide'],
  'medikation', ARRAY['#Medikation','#Tierarzt'],
  'medikation', NULL,
  'Corticosteroida', NULL),

('Dexamethason',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Tierarzt'],
  'medikation', NULL,
  'Dexamethasonum', NULL),

('Triamcinolon',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Gelenk','#Tierarzt'],
  'medikation', NULL,
  'Triamcinolonacetonid', NULL),

('Tiludronsäure',
  ARRAY['Tildren'],
  'medikation', ARRAY['#Medikation','#Navicular','#Tierarzt'],
  'medikation', NULL,
  'Acidum tiludronicum', NULL),

('Kupfersulfat-Lösung',
  ARRAY['Kupfersulfat','CuSO4'],
  'medikation', ARRAY['#Medikation','#Strahl','#WLD'],
  'massnahme', NULL,
  'Solutio cupri sulfatis', NULL),

('Betaisodona',
  ARRAY['Povidon-Iod','Jod'],
  'medikation', ARRAY['#Medikation','#Desinfektion'],
  'massnahme', NULL,
  'Povidonum iodatum', NULL),

('Biotin',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Futterzusatz','#Hufhorn'],
  'ernaehrung', NULL,
  'Biotinum (Vitamin H)', NULL),

('Methionin',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Futterzusatz','#Aminosäure'],
  'ernaehrung', NULL,
  'L-Methioninum', NULL),

('Antibiotika',
  ARRAY['Antibiose'],
  'medikation', ARRAY['#Medikation','#Tierarzt'],
  'medikation', NULL,
  'Antibiotica', NULL),

('Penicillin',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Tierarzt'],
  'medikation', NULL,
  'Penicillinum', NULL),

('Trimethoprim-Sulfonamid',
  ARRAY['TMS','Trimetho-Sulfa'],
  'medikation', ARRAY['#Medikation','#Tierarzt'],
  'medikation', NULL,
  'Trimethoprim-Sulfamethoxazolum', NULL),

('Stosswellentherapie',
  ARRAY['ESWT','Shockwave'],
  'medikation', ARRAY['#Medikation','#Therapie'],
  'massnahme', NULL,
  'Therapia undis extracorporalibus', NULL),

('Magnetfeldtherapie',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Therapie'],
  'massnahme', NULL,
  'Therapia campis magneticis', NULL),

('Lasertherapie',
  ARRAY['LLLT','Low Level Laser'],
  'medikation', ARRAY['#Medikation','#Therapie'],
  'massnahme', NULL,
  'Lasertherapia', NULL),

('Physiotherapie',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Therapie'],
  'massnahme', NULL,
  'Physiotherapia', NULL),

('Osteopathie',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Therapie','#Ganzheitlich'],
  'massnahme', NULL,
  'Osteopathia', NULL),

('Chiropraktik',
  ARRAY['Wirbelsäulenbehandlung'],
  'medikation', ARRAY['#Medikation','#Therapie'],
  'massnahme', NULL,
  'Chiropractio', NULL),

('Epsom-Salz-Bad',
  ARRAY['Magnesiumsulfat-Bad'],
  'medikation', ARRAY['#Medikation','#Abszess','#Therapie'],
  'massnahme', NULL,
  'Balneum cum magnesia sulfate', NULL),

('Hufhärter',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Hufhorn'],
  'massnahme', NULL,
  NULL, NULL),

('Hufpflegeöl',
  ARRAY[]::text[],
  'medikation', ARRAY['#Medikation','#Hufhorn'],
  'massnahme', NULL,
  NULL, NULL),

-- ============================================================
-- HALTUNG
-- ============================================================
('Offenstall',
  ARRAY['Open Barn','Auslaufstall'],
  'haltung', ARRAY['#Haltung','#Barhuf'],
  'haltung', NULL,
  'Stabulum apertum', NULL),

('Laufstall',
  ARRAY['Track System','Paddock Paradise'],
  'haltung', ARRAY['#Haltung','#Bewegung'],
  'haltung', NULL,
  'Stabulum liberum', NULL),

('Boxenhaltung',
  ARRAY['Box Stall'],
  'haltung', ARRAY['#Haltung'],
  'haltung', NULL,
  'Stabulum singulare', NULL),

('Weidehaltung',
  ARRAY['Pasture','Grasland'],
  'haltung', ARRAY['#Haltung','#Ernährung'],
  'haltung', NULL,
  'Pascuum', NULL),

('Frühjahrsgras',
  ARRAY['Fruktan','NSC','Zuckergras'],
  'haltung', ARRAY['#Haltung','#Rehe','#EMS'],
  'ernaehrung', 'activate_rehe_protocol',
  'Herba verna', NULL),

('Fruktan',
  ARRAY['Fructan'],
  'haltung', ARRAY['#Ernährung','#Rehe','#EMS'],
  'ernaehrung', NULL,
  'Fructanum', NULL),

('NSC',
  ARRAY['Non-structural Carbohydrates','Zucker und Stärke'],
  'haltung', ARRAY['#Ernährung','#EMS','#Rehe'],
  'ernaehrung', NULL,
  'Carbohudrata non structuralia', NULL),

('Bewegungspensum',
  ARRAY['Trainingsintensität'],
  'haltung', ARRAY['#Haltung','#Reha'],
  'bewegung', NULL,
  'Quantitas exercitationis', NULL),

('Reha-Programm',
  ARRAY['Rehabilitation'],
  'haltung', ARRAY['#Haltung','#Therapie'],
  'massnahme', NULL,
  'Programma rehabilitationis', NULL),

('Stallhygiene',
  ARRAY[]::text[],
  'haltung', ARRAY['#Haltung'],
  'haltung', NULL,
  'Hygiena stabuli', NULL),

('Einstreu',
  ARRAY['Bedding'],
  'haltung', ARRAY['#Haltung'],
  'haltung', NULL,
  'Stramentum', NULL),

('Gummimatte',
  ARRAY['Stallmatte'],
  'haltung', ARRAY['#Haltung'],
  'haltung', NULL,
  'Storea elastica', NULL),

('Trainingsprogramm',
  ARRAY[]::text[],
  'haltung', ARRAY['#Haltung','#Reha'],
  'bewegung', NULL,
  NULL, NULL),

('Raufutter',
  ARRAY['Heu','Roughage'],
  'haltung', ARRAY['#Ernährung'],
  'ernaehrung', NULL,
  'Pabulum grossum', NULL),

('Kraftfutter',
  ARRAY['Müsli','Pellets'],
  'haltung', ARRAY['#Ernährung'],
  'ernaehrung', NULL,
  'Pabulum concentratum', NULL),

('Mineralfutter',
  ARRAY['Mineralergänzung'],
  'haltung', ARRAY['#Ernährung','#Hufhorn'],
  'ernaehrung', NULL,
  'Pabulum minerale', NULL),

-- ============================================================
-- BIOMECHANIK
-- ============================================================
('Dorsopalmar-Balance',
  ARRAY['DP-Balance','Dorsopalmarer Ausgleich'],
  'biomechanik', ARRAY['#Biomechanik','#Balance'],
  'balance_befund', NULL,
  'Aequilibrium dorsopalmare', NULL),

('Mediolateral-Balance',
  ARRAY['ML-Balance','Seitenbalance'],
  'biomechanik', ARRAY['#Biomechanik','#Balance'],
  'balance_befund', NULL,
  'Aequilibrium mediolaterale', NULL),

('Hufachse',
  ARRAY['Phalangenachse','Zehenachse'],
  'biomechanik', ARRAY['#Biomechanik','#Balance'],
  'balance_befund', NULL,
  'Axis ungulae', NULL),

('Break-Over',
  ARRAY['Abrollpunkt','Break-Over-Punkt'],
  'biomechanik', ARRAY['#Biomechanik','#Beschlag'],
  'balance_befund', NULL,
  'Punctum flexionis', NULL),

('Bodenreaktionskraft',
  ARRAY['GRF','Ground Reaction Force'],
  'biomechanik', ARRAY['#Biomechanik'],
  'diagnostik_befund', NULL,
  'Vis reactionis soli', NULL),

('Druckverteilung',
  ARRAY['Druckplatte','Pressure Distribution'],
  'biomechanik', ARRAY['#Biomechanik','#Diagnostik'],
  'diagnostik_befund', NULL,
  'Distributio pressurae', NULL),

('Gangzyklus',
  ARRAY['Schrittfolge'],
  'biomechanik', ARRAY['#Biomechanik'],
  'diagnostik_befund', NULL,
  'Cyclus gressus', NULL),

('Stützbeinphase',
  ARRAY['Stance Phase'],
  'biomechanik', ARRAY['#Biomechanik'],
  'diagnostik_befund', NULL,
  'Phasea sustentationis', NULL),

('Hangbeinphase',
  ARRAY['Swing Phase'],
  'biomechanik', ARRAY['#Biomechanik'],
  'diagnostik_befund', NULL,
  'Phasea pensionis', NULL),

('Zehenwinkel',
  ARRAY['Hufwinkel','Dorsalwinkel'],
  'biomechanik', ARRAY['#Biomechanik','#Balance','#Beschlag'],
  'balance_befund', NULL,
  'Angulus dorsalis ungulae', NULL),

('Palmarwinkel',
  ARRAY['Trachtenwinkel','Heel Angle'],
  'biomechanik', ARRAY['#Biomechanik','#Balance'],
  'balance_befund', NULL,
  'Angulus palmaris ungulae', NULL),

('Trachtenlänge',
  ARRAY['Heel Height','Trachtenhöhe'],
  'biomechanik', ARRAY['#Biomechanik','#Balance','#Beschlag'],
  'balance_befund', NULL,
  'Longitudo talonorum', NULL),

('Momentarm',
  ARRAY['Lever Arm'],
  'biomechanik', ARRAY['#Biomechanik'],
  'balance_befund', NULL,
  'Brachium momentanum', NULL),

('Hufmorphometrie',
  ARRAY['Hufmaße','Hufmessung'],
  'biomechanik', ARRAY['#Biomechanik','#Diagnostik'],
  'diagnostik_befund', NULL,
  'Morphometria ungulae', NULL),

-- ============================================================
-- FACHBEGRIFF
-- ============================================================
('Hufschmied',
  ARRAY['Hufbeschlagschmied','Farrier'],
  'fachbegriff', ARRAY['#Fachbegriff','#B2B_Abrechnung'],
  NULL, NULL,
  'Faber ferrarius', NULL),

('Hufpfleger',
  ARRAY['Barefoot Trimmer','Hufpflegerin'],
  'fachbegriff', ARRAY['#Fachbegriff'],
  NULL, NULL,
  'Pedipedis curator', NULL),

('Huforthopäde',
  ARRAY['Huforthopädin'],
  'fachbegriff', ARRAY['#Fachbegriff','#B2B'],
  NULL, NULL,
  'Orthopaedista ungulae', NULL),

('Tierarzt',
  ARRAY['Veterinär','TA'],
  'fachbegriff', ARRAY['#Fachbegriff','#Tierarzt'],
  NULL, NULL,
  'Veterinarius', NULL),

('Befund',
  ARRAY['Diagnose','Untersuchungsergebnis'],
  'fachbegriff', ARRAY['#Fachbegriff','#B2B_Abrechnung'],
  'befund_allgemein', NULL,
  'Status praesens', NULL),

('Maßnahme',
  ARRAY['Behandlung','Therapie'],
  'fachbegriff', ARRAY['#Fachbegriff','#B2B_Abrechnung'],
  'massnahme', NULL,
  'Actio therapeutica', NULL),

('Befundprotokoll',
  ARRAY['Untersuchungsbericht'],
  'fachbegriff', ARRAY['#Fachbegriff','#B2B_Abrechnung'],
  'befund_allgemein', NULL,
  'Protocollum examinationis', NULL),

('Hufkorrektur',
  ARRAY[]::text[],
  'fachbegriff', ARRAY['#Fachbegriff','#Beschlag'],
  'massnahme', NULL,
  'Correctura ungulae', NULL),

('Hufpflege',
  ARRAY[]::text[],
  'fachbegriff', ARRAY['#Fachbegriff'],
  'massnahme', NULL,
  'Cura ungulae', NULL),

('Intervall',
  ARRAY['Beschlagsintervall','Pflegeintervall'],
  'fachbegriff', ARRAY['#Fachbegriff','#Termin'],
  'naechster_termin', NULL,
  'Intervallum', NULL),

('Nachsorge',
  ARRAY['Follow-up','Kontrolle'],
  'fachbegriff', ARRAY['#Fachbegriff','#Termin'],
  'naechster_termin', NULL,
  'Cura sequens', NULL),

('Kontrolltermin',
  ARRAY['Kontrollbesuch','Follow-up-Termin'],
  'fachbegriff', ARRAY['#Fachbegriff','#Termin'],
  'naechster_termin', 'create_calendar_entry',
  'Revisio', NULL),

('Erstbefund',
  ARRAY['Erstuntersuchung'],
  'fachbegriff', ARRAY['#Fachbegriff','#Befund'],
  'befund_allgemein', NULL,
  'Prima inspectio', NULL),

('Verlaufskontrolle',
  ARRAY['Progresskontrolle'],
  'fachbegriff', ARRAY['#Fachbegriff','#Befund'],
  'befund_allgemein', NULL,
  'Observatio progressus', NULL),

('Anamnese',
  ARRAY['Vorgeschichte','Krankengeschichte'],
  'fachbegriff', ARRAY['#Fachbegriff','#Diagnostik'],
  'befund_allgemein', NULL,
  'Anamnesis', NULL),

('Prognose',
  ARRAY[]::text[],
  'fachbegriff', ARRAY['#Fachbegriff','#Diagnostik'],
  'befund_allgemein', NULL,
  'Prognosis', NULL),

('Rezidiv',
  ARRAY['Rückfall','Wiederauftreten'],
  'fachbegriff', ARRAY['#Fachbegriff','#Chronisch'],
  'befund_allgemein', NULL,
  'Recidivum', NULL),

('Akut',
  ARRAY[]::text[],
  'fachbegriff', ARRAY['#Fachbegriff'],
  'befund_allgemein', NULL,
  'Acutus', NULL),

('Chronisch',
  ARRAY[]::text[],
  'fachbegriff', ARRAY['#Fachbegriff'],
  'befund_allgemein', NULL,
  'Chronicus', NULL),

('Bilateral',
  ARRAY['Beidseitig'],
  'fachbegriff', ARRAY['#Fachbegriff'],
  'befund_allgemein', NULL,
  'Bilateralis', NULL),

('Unilateral',
  ARRAY['Einseitig'],
  'fachbegriff', ARRAY['#Fachbegriff'],
  'befund_allgemein', NULL,
  'Unilateralis', NULL)

ON CONFLICT (lower(term)) DO NOTHING;
