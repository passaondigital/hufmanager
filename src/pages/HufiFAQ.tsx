import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

export default function HufiFAQ() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    setLoading(true);
    try {
      const from = (table: string) =>
        (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

      const { data } = await from("hufi_faq")
        .select("id, question, answer, category, sort_order")
        .eq("active", true)
        .order("sort_order") as { data: FaqRow[] | null };

      setFaqs(data ?? []);
    } catch (err) {
      console.warn("[HufiFAQ] load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const faq of faqs) {
      if (!seen.has(faq.category)) {
        seen.add(faq.category);
        result.push(faq.category);
      }
    }
    return result;
  }, [faqs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return faqs.filter((faq) => {
      const matchCat = !activeCategory || faq.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
      );
    });
  }, [faqs, search, activeCategory]);

  function categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      erste_schritte: "Erste Schritte",
      pferdeakten: "Pferdeakten",
      termine_routen: "Termine & Routen",
      kommunikation: "Kommunikation",
      datenschutz: "Datenschutz",
      abos: "Abos & Preise",
    };
    return map[cat] ?? cat;
  }

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "20px 16px 40px",
        fontFamily: "inherit",
      }}
    >
      {/* Back + Heading */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "#F97316",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            padding: "0",
            marginBottom: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          ← Zurück
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#1A1A1A", margin: "0 0 4px 0" }}>
          Häufige Fragen
        </h1>
        <p style={{ fontSize: "13px", color: "#6B7280", margin: "0" }}>
          Alles was du über Hufi wissen möchtest.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "14px" }}>
        <Input
          placeholder="Suche nach Stichworten..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              background: activeCategory === null ? "#F97316" : "transparent",
              color: activeCategory === null ? "#FFFFFF" : "#6B7280",
              border: `1.5px solid ${activeCategory === null ? "#F97316" : "#D1D5DB"}`,
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Alle
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              style={{
                background: activeCategory === cat ? "#F97316" : "transparent",
                color: activeCategory === cat ? "#FFFFFF" : "#6B7280",
                border: `1.5px solid ${activeCategory === cat ? "#F97316" : "#D1D5DB"}`,
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {/* FAQ list */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: "14px", paddingTop: "24px" }}>
          Wird geladen...
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: "14px", paddingTop: "24px" }}>
          Keine Ergebnisse gefunden.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((faq) => (
            <div
              key={faq.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: openId === faq.id ? "0 2px 8px rgba(0,0,0,0.07)" : "none",
                transition: "box-shadow 0.15s",
              }}
            >
              {/* Question row */}
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "10px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: 0 }}>
                  <Badge
                    variant="outline"
                    style={{
                      fontSize: "10px",
                      color: "#F97316",
                      borderColor: "#FDBA74",
                      background: "#FFF7ED",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {categoryLabel(faq.category)}
                  </Badge>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#1A1A1A", lineHeight: "1.4" }}>
                    {faq.question}
                  </span>
                </div>
                <span
                  style={{
                    color: "#F97316",
                    fontSize: "18px",
                    lineHeight: "1",
                    flexShrink: 0,
                    transform: openId === faq.id ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▾
                </span>
              </button>

              {/* Answer */}
              {openId === faq.id && (
                <div
                  style={{
                    padding: "0 16px 14px",
                    borderTop: "1px solid #F3F4F6",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#374151",
                      lineHeight: "1.65",
                      margin: "12px 0 0",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
