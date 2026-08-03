import type { ReactNode } from "react";

// Kein react-markdown o.ä. im Projekt vorhanden (geprüft) -- Hufi-Antworten
// enthielten bisher rohe Markdown-Zeichen ("## Titel", "**Wort**") als
// sichtbaren Text. Statt einer neuen Abhängigkeit ein kleiner, auf das
// tatsächlich benötigte Subset begrenzter Renderer: Überschriften (#/##/###),
// **fett**, Listen (-/*/1.) und Links. Baut React-Elemente statt
// dangerouslySetInnerHTML -- roh eingefügtes HTML kann dadurch nicht
// ausgeführt werden, React escaped Text-Knoten ohnehin automatisch.
// Farben werden bewusst NICHT hart gesetzt (außer Links), damit der Text
// die Farbe der umgebenden Chat-Blase erbt -- funktioniert unabhängig davon,
// ob die Blase hell oder dunkel ist.

function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

let inlineKeySeq = 0;

function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index));
    const key = `il-${inlineKeySeq++}`;

    if (match[1] !== undefined && match[2] !== undefined) {
      // [text](url)
      nodes.push(
        isSafeHttpUrl(match[2])
          ? <a key={key} href={match[2]} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 600, wordBreak: "break-word" }}>{match[1]}</a>
          : match[1]
      );
    } else if (match[3] !== undefined) {
      // **bold**
      nodes.push(<strong key={key} style={{ fontWeight: 700 }}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      // bare URL
      nodes.push(
        isSafeHttpUrl(match[4])
          ? <a key={key} href={match[4]} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 600, wordBreak: "break-word" }}>{match[4]}</a>
          : match[4]
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}

interface HufiMarkdownProps {
  text: string;
}

export function HufiMarkdown({ text }: HufiMarkdownProps) {
  if (!text || !text.trim()) return null;

  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  function flushList() {
    if (!listBuffer) return;
    const items = listBuffer.items;
    const ordered = listBuffer.ordered;
    const ListTag = ordered ? "ol" : "ul";
    blocks.push(
      <ListTag key={`list-${blocks.length}`} style={{ margin: "4px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <li key={i} style={{ lineHeight: 1.5 }}>{renderInline(item)}</li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) { flushList(); return; }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      // Mobil kompakt: keine Browser-Standard-Überschriftengrößen, nur
      // gestufte Gewichtung/Größe nahe der normalen Bubble-Schrift (14px).
      const fontSize = level === 1 ? 16 : level === 2 ? 15 : 14;
      blocks.push(
        <div key={`h-${idx}`} style={{ fontSize, fontWeight: 700, margin: blocks.length === 0 ? "0 0 4px" : "10px 0 4px", lineHeight: 1.3 }}>
          {renderInline(headingMatch[2])}
        </div>
      );
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberedMatch = !bulletMatch ? line.match(/^\d+\.\s+(.*)$/) : null;
    if (bulletMatch || numberedMatch) {
      const ordered = !!numberedMatch;
      const content = (bulletMatch ?? numberedMatch)![1];
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push(content);
      return;
    }

    flushList();
    blocks.push(
      <div key={`p-${idx}`} style={{ margin: blocks.length === 0 ? 0 : "6px 0 0", lineHeight: 1.5 }}>
        {renderInline(line)}
      </div>
    );
  });
  flushList();

  return <>{blocks}</>;
}
