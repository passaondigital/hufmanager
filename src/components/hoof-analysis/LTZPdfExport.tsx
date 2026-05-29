import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  LTZHoofData,
  STANCE_OPTIONS,
  CROUP_MOVEMENT_OPTIONS,
  BELLY_SWING_OPTIONS,
  FOOTFALL_OPTIONS,
  PASTERN_ANGLE_OPTIONS,
  CORONET_THEORY_OPTIONS,
  SOLE_FROG_PLANE_OPTIONS,
  LANDING_THEORY_OPTIONS,
  HORN_QUALITY_OPTIONS,
  TOE_AXIS_OPTIONS,
  HOOF_POSITIONS,
} from "./ltz-constants";

interface HoofAnalysis {
  id: string;
  created_at: string;
  stance_front: string | null;
  stance_rear: string | null;
  croup_movement: string | null;
  belly_swing: string | null;
  footfall_left: string | null;
  footfall_right: string | null;
  hoof_data_vl: LTZHoofData | null;
  hoof_data_vr: LTZHoofData | null;
  hoof_data_hl: LTZHoofData | null;
  hoof_data_hr: LTZHoofData | null;
  notes: string | null;
  recommendations: string[] | null;
  status: string | null;
}

interface LTZPdfExportProps {
  analysis: HoofAnalysis;
  horseName: string;
  ownerName?: string;
  providerName?: string;
  variant?: "icon" | "button";
}

// HTML escaping to prevent XSS attacks in generated PDF
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Escape URL for safe inclusion in HTML attributes
function escapeUrl(url: string | null | undefined): string {
  if (!url) return '';
  // Basic URL validation and escaping
  try {
    const parsed = new URL(url);
    // Only allow http, https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return escapeHtml(url);
  } catch {
    return '';
  }
}

function getLabel(options: readonly { value: string; label: string }[], value?: string): string {
  return options.find(o => o.value === value)?.label || '—';
}

function getStatusColor(value: string | undefined, goodValue: string): string {
  if (!value) return '#6b7280';
  return value === goodValue ? '#22c55e' : '#f59e0b';
}

export function LTZPdfExport({ analysis, horseName, ownerName, providerName, variant = "icon" }: LTZPdfExportProps) {
  const handleExport = () => {
    const hoofData = {
      vl: (analysis.hoof_data_vl || {}) as LTZHoofData,
      vr: (analysis.hoof_data_vr || {}) as LTZHoofData,
      hl: (analysis.hoof_data_hl || {}) as LTZHoofData,
      hr: (analysis.hoof_data_hr || {}) as LTZHoofData,
    };

    const dateStr = format(parseISO(analysis.created_at), "dd.MM.yyyy", { locale: de });
    const timeStr = format(parseISO(analysis.created_at), "HH:mm", { locale: de });

    // Escape all user-controlled data to prevent XSS
    const safeHorseName = escapeHtml(horseName);
    const safeOwnerName = escapeHtml(ownerName);
    const safeProviderName = escapeHtml(providerName);
    const safeNotes = escapeHtml(analysis.notes);
    const safeRecommendations = (analysis.recommendations || []).map(r => escapeHtml(r));

    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>LTZ Bearbeitungsbogen - ${safeHorseName}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1a1a1a;
      background: white;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #f47b20;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .header-left h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .header-left p {
      font-size: 10pt;
      color: #6b7280;
    }
    .header-right {
      text-align: right;
      font-size: 9pt;
      color: #6b7280;
    }
    .header-right strong {
      display: block;
      font-size: 11pt;
      color: #1a1a1a;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #f47b20;
      border-bottom: 1px solid #f47b20;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .info-item {
      background: #f8f9fa;
      padding: 6px 8px;
      border-radius: 4px;
    }
    .info-item label {
      display: block;
      font-size: 8pt;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .info-item span {
      font-weight: 600;
      font-size: 10pt;
    }
    .hoof-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9pt;
    }
    .hoof-table th, .hoof-table td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      text-align: center;
    }
    .hoof-table th {
      background: #f47b20;
      color: white;
      font-weight: 600;
      font-size: 9pt;
    }
    .hoof-table th:first-child {
      text-align: left;
      width: 25%;
    }
    .hoof-table td:first-child {
      text-align: left;
      font-weight: 500;
      background: #f8f9fa;
    }
    .hoof-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    .status-good {
      color: #22c55e;
      font-weight: 600;
    }
    .status-warning {
      color: #f59e0b;
      font-weight: 600;
    }
    .status-neutral {
      color: #6b7280;
    }
    .recommendations {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 6px;
      padding: 10px;
      margin-top: 10px;
    }
    .recommendations h3 {
      font-size: 10pt;
      color: #ea580c;
      margin-bottom: 6px;
    }
    .recommendations ul {
      margin: 0;
      padding-left: 18px;
    }
    .recommendations li {
      font-size: 9pt;
      margin-bottom: 3px;
      color: #1a1a1a;
    }
    .notes-section {
      background: #f1f5f9;
      border-radius: 6px;
      padding: 10px;
      margin-top: 10px;
    }
    .notes-section h3 {
      font-size: 10pt;
      color: #475569;
      margin-bottom: 6px;
    }
    .notes-section p {
      font-size: 9pt;
      color: #1a1a1a;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #9ca3af;
    }
    .signature-area {
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .signature-box {
      border-top: 1px solid #1a1a1a;
      padding-top: 5px;
      font-size: 9pt;
      color: #6b7280;
    }
    .hoof-photos {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    .hoof-photo {
      text-align: center;
    }
    .hoof-photo img {
      max-width: 100%;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .hoof-photo p {
      font-size: 8pt;
      color: #6b7280;
      margin-top: 4px;
    }
    .no-photo {
      width: 100%;
      height: 80px;
      background: #f3f4f6;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 8pt;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>LTZ Bearbeitungsbogen</h1>
        <p>Hufanalyse nach Leipziger Standard</p>
      </div>
      <div class="header-right">
        <strong>${safeHorseName}</strong>
        ${safeOwnerName ? `Besitzer: ${safeOwnerName}` : ''}
        <br>Datum: ${dateStr} | ${timeStr}
        ${safeProviderName ? `<br>Bearbeiter: ${safeProviderName}` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Exterieur & Gangbild</div>
      <div class="info-grid">
        <div class="info-item">
          <label>Stellung Vordergliedmaße</label>
          <span>${getLabel(STANCE_OPTIONS, analysis.stance_front || undefined)}</span>
        </div>
        <div class="info-item">
          <label>Stellung Hintergliedmaße</label>
          <span>${getLabel(STANCE_OPTIONS, analysis.stance_rear || undefined)}</span>
        </div>
        <div class="info-item">
          <label>Bewegung Kruppe</label>
          <span>${getLabel(CROUP_MOVEMENT_OPTIONS, analysis.croup_movement || undefined)}</span>
        </div>
        <div class="info-item">
          <label>Bauchpendel</label>
          <span>${getLabel(BELLY_SWING_OPTIONS, analysis.belly_swing || undefined)}</span>
        </div>
        <div class="info-item">
          <label>Fußung Links</label>
          <span>${getLabel(FOOTFALL_OPTIONS, analysis.footfall_left || undefined)}</span>
        </div>
        <div class="info-item">
          <label>Fußung Rechts</label>
          <span>${getLabel(FOOTFALL_OPTIONS, analysis.footfall_right || undefined)}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Hufbefunde</div>
      <table class="hoof-table">
        <thead>
          <tr>
            <th>Parameter</th>
            ${HOOF_POSITIONS.map(h => `<th>${h.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fesselstand (1/3:2/3)</td>
            ${HOOF_POSITIONS.map(h => {
              const data = hoofData[h.key as keyof typeof hoofData];
              const val = data.pasternAngle;
              const cls = val === 'correct' ? 'status-good' : val ? 'status-warning' : 'status-neutral';
              return `<td class="${cls}">${getLabel(PASTERN_ANGLE_OPTIONS, val)}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td>Zehenachse</td>
            ${HOOF_POSITIONS.map(h => {
              const data = hoofData[h.key as keyof typeof hoofData];
              const val = data.toeAxis;
              const cls = val === 'straight' ? 'status-good' : val ? 'status-warning' : 'status-neutral';
              return `<td class="${cls}">${getLabel(TOE_AXIS_OPTIONS, val)}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td>Kronrandtheorie</td>
            ${HOOF_POSITIONS.map(h => {
              const data = hoofData[h.key as keyof typeof hoofData];
              const val = data.coronetTheory;
              const cls = val === 'equal' ? 'status-good' : val ? 'status-warning' : 'status-neutral';
              return `<td class="${cls}">${getLabel(CORONET_THEORY_OPTIONS, val)}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td>Sohle-Strahl-Ebene</td>
            ${HOOF_POSITIONS.map(h => {
              const data = hoofData[h.key as keyof typeof hoofData];
              const val = data.soleFrogPlane;
              const cls = val === 'equal' ? 'status-good' : val ? 'status-warning' : 'status-neutral';
              return `<td class="${cls}">${getLabel(SOLE_FROG_PLANE_OPTIONS, val)}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td>Fußungstheorie</td>
            ${HOOF_POSITIONS.map(h => {
              const data = hoofData[h.key as keyof typeof hoofData];
              const val = data.landingTheory;
              const cls = val === 'flat' ? 'status-good' : val ? 'status-warning' : 'status-neutral';
              return `<td class="${cls}">${getLabel(LANDING_THEORY_OPTIONS, val)}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td>Hornqualität</td>
            ${HOOF_POSITIONS.map(h => {
              const data = hoofData[h.key as keyof typeof hoofData];
              const val = data.hornQuality;
              const cls = val === 'normal' ? 'status-good' : val ? 'status-warning' : 'status-neutral';
              return `<td class="${cls}">${getLabel(HORN_QUALITY_OPTIONS, val)}</td>`;
            }).join('')}
          </tr>
        </tbody>
      </table>
    </div>

    ${(hoofData.vl.photoUrl || hoofData.vr.photoUrl || hoofData.hl.photoUrl || hoofData.hr.photoUrl) ? `
    <div class="section">
      <div class="section-title">Huf-Fotos</div>
      <div class="hoof-photos">
        ${HOOF_POSITIONS.map(h => {
          const data = hoofData[h.key as keyof typeof hoofData];
          const safePhotoUrl = escapeUrl(data.photoUrl);
          return `
            <div class="hoof-photo">
              ${safePhotoUrl 
                ? `<img src="${safePhotoUrl}" alt="${escapeHtml(h.fullLabel)}" />`
                : `<div class="no-photo">Kein Foto</div>`
              }
              <p>${escapeHtml(h.fullLabel)}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    ${(safeRecommendations && safeRecommendations.length > 0) ? `
    <div class="recommendations">
      <h3>⚠️ Bearbeitungsempfehlungen</h3>
      <ul>
        ${safeRecommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${safeNotes ? `
    <div class="notes-section">
      <h3>Zusätzliche Notizen</h3>
      <p>${safeNotes}</p>
    </div>
    ` : ''}

    <div class="signature-area">
      <div class="signature-box">Unterschrift Hufbearbeiter</div>
      <div class="signature-box">Unterschrift Pferdebesitzer</div>
    </div>

    <div class="footer">
      <span>LTZ Bearbeitungsbogen - Generiert mit Hufi</span>
      <span>Seite 1 von 1</span>
    </div>
  </div>
</body>
</html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait for images to load then print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        onClick={handleExport}
        className="w-full gap-2"
      >
        <FileDown className="h-4 w-4" />
        Letzten Analyse-Bericht laden
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      PDF Export
    </Button>
  );
}
