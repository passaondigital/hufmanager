import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Brain,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

// ─── Type definitions ────────────────────────────────────────────────────────

interface HufiProfession {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  typical_services: string[] | null;
  relevant_keywords: string[] | null;
}

interface HufiHorseBreed {
  id: string;
  name: string;
  name_en: string | null;
  category: string | null;
  is_active: boolean;
}

interface HufiHealthCondition {
  id: string;
  name: string;
  name_en: string | null;
  category: string | null;
  urgency: string | null;
  hoof_relevance: boolean | null;
  is_active: boolean;
}

interface HufiEquipment {
  id: string;
  name: string;
  category: string | null;
  for_roles: string[] | null;
  is_active: boolean;
}

interface HufiTerminology {
  id: string;
  term_de: string;
  term_en: string | null;
  term_latin: string | null;
  category: string | null;
  is_active: boolean;
}

interface HufiKeyword {
  id: string;
  keyword: string;
  entity_type: string | null;
  entity_id: string | null;
  language: string | null;
  is_active: boolean;
}

// ─── Helper components ───────────────────────────────────────────────────────

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function ErrorRow({ cols, message }: { cols: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols}>
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </TableCell>
    </TableRow>
  );
}

function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (!urgency) return <Badge variant="secondary">—</Badge>;
  const map: Record<string, { label: string; className: string }> = {
    emergency: { label: "Notfall", className: "bg-red-600 text-white" },
    high: { label: "Hoch", className: "bg-orange-500 text-white" },
    medium: { label: "Mittel", className: "bg-yellow-500 text-black" },
    low: { label: "Niedrig", className: "bg-green-600 text-white" },
  };
  const info = map[urgency] ?? { label: urgency, className: "" };
  return <Badge className={info.className}>{info.label}</Badge>;
}

// ─── Tab 1: Berufe ───────────────────────────────────────────────────────────

function BerufeTab() {
  const [items, setItems] = useState<HufiProfession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editCategory, setEditCategory] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("hufi_professions")
        .select("id, name, category, is_active, typical_services, relevant_keywords")
        .order("name");
      if (err) throw err;
      const rows = (data ?? []) as HufiProfession[];
      setItems(rows);
      const names: Record<string, string> = {};
      const cats: Record<string, string> = {};
      rows.forEach((r) => {
        names[r.id] = r.name;
        cats[r.id] = r.category ?? "";
      });
      setEditName(names);
      setEditCategory(cats);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      toast.error("Berufe konnten nicht geladen werden: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from("hufi_professions")
        .update({ is_active: !current })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      toast.success("Status aktualisiert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const saveRow = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from("hufi_professions")
        .update({ name: editName[id], category: editCategory[id] || null })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) =>
        prev.map((r) => r.id === id ? { ...r, name: editName[id], category: editCategory[id] || null } : r)
      );
      toast.success("Beruf gespeichert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Berufe</CardTitle>
        <CardDescription>Alle Berufsprofile im Hufi-Brain</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingRows cols={5} />}
            {!loading && error && <ErrorRow cols={5} message={error} />}
            {!loading && !error && items.map((item) => (
              <>
                <TableRow key={item.id}>
                  <TableCell>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expanded.has(item.id)
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editName[item.id] ?? item.name}
                      onChange={(e) => setEditName((p) => ({ ...p, [item.id]: e.target.value }))}
                      className="h-8 w-48"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editCategory[item.id] ?? ""}
                      onChange={(e) => setEditCategory((p) => ({ ...p, [item.id]: e.target.value }))}
                      className="h-8 w-36"
                      placeholder="Kategorie"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item.id, item.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => saveRow(item.id)}>
                      Speichern
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded.has(item.id) && (
                  <TableRow key={`${item.id}-detail`} className="bg-muted/40">
                    <TableCell />
                    <TableCell colSpan={4}>
                      <div className="py-2 space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Typische Leistungen: </span>
                          {item.typical_services?.join(", ") || "—"}
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Keywords: </span>
                          {item.relevant_keywords?.join(", ") || "—"}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            {!loading && !error && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Keine Berufe gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Tab 2: Rassen ───────────────────────────────────────────────────────────

function RassenTab() {
  const [items, setItems] = useState<HufiHorseBreed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("hufi_horse_breeds")
        .select("id, name, name_en, category, is_active")
        .order("name");
      if (err) throw err;
      setItems((data ?? []) as HufiHorseBreed[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      toast.error("Rassen konnten nicht geladen werden: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from("hufi_horse_breeds")
        .update({ is_active: !current })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      toast.success("Status aktualisiert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.name_en ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pferderassen</CardTitle>
        <CardDescription>Alle Rassen im Hufi-Brain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Rasse suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name (DE)</TableHead>
              <TableHead>Name (EN)</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Aktiv</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingRows cols={4} />}
            {!loading && error && <ErrorRow cols={4} message={error} />}
            {!loading && !error && filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.name_en ?? "—"}</TableCell>
                <TableCell>{item.category ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => toggleActive(item.id, item.is_active)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Keine Rassen gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Tab 3: Erkrankungen ─────────────────────────────────────────────────────

function ErkrankungenTab() {
  const [items, setItems] = useState<HufiHealthCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("hufi_health_conditions")
        .select("id, name, name_en, category, urgency, hoof_relevance, is_active")
        .order("name");
      if (err) throw err;
      setItems((data ?? []) as HufiHealthCondition[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      toast.error("Erkrankungen konnten nicht geladen werden: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from("hufi_health_conditions")
        .update({ is_active: !current })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      toast.success("Status aktualisiert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const urgencies = ["emergency", "high", "medium", "low"];

  const filtered = items.filter((i) => {
    const catOk = categoryFilter === "all" || i.category === categoryFilter;
    const urgOk = urgencyFilter === "all" || i.urgency === urgencyFilter;
    return catOk && urgOk;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Erkrankungen & Gesundheit</CardTitle>
        <CardDescription>Alle Gesundheitszustände im Hufi-Brain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Dringlichkeit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Dringlichkeiten</SelectItem>
              {urgencies.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name (DE)</TableHead>
              <TableHead>Name (EN)</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Dringlichkeit</TableHead>
              <TableHead>Huf-Relevanz</TableHead>
              <TableHead>Aktiv</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingRows cols={6} />}
            {!loading && error && <ErrorRow cols={6} message={error} />}
            {!loading && !error && filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.name_en ?? "—"}</TableCell>
                <TableCell>{item.category ?? "—"}</TableCell>
                <TableCell><UrgencyBadge urgency={item.urgency} /></TableCell>
                <TableCell>
                  {item.hoof_relevance === true
                    ? <Badge variant="outline" className="text-green-700 border-green-700">Ja</Badge>
                    : <Badge variant="secondary">Nein</Badge>}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => toggleActive(item.id, item.is_active)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Keine Einträge gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Tab 4: Ausrüstung ───────────────────────────────────────────────────────

function AusruestungTab() {
  const [items, setItems] = useState<HufiEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("hufi_equipment")
        .select("id, name, category, for_roles, is_active")
        .order("name");
      if (err) throw err;
      setItems((data ?? []) as HufiEquipment[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      toast.error("Ausrüstung konnte nicht geladen werden: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from("hufi_equipment")
        .update({ is_active: !current })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      toast.success("Status aktualisiert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const filtered = categoryFilter === "all" ? items : items.filter((i) => i.category === categoryFilter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ausrüstung & Werkzeug</CardTitle>
        <CardDescription>Alle Ausrüstungsgegenstände im Hufi-Brain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Für Rollen</TableHead>
              <TableHead>Aktiv</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingRows cols={4} />}
            {!loading && error && <ErrorRow cols={4} message={error} />}
            {!loading && !error && filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.for_roles?.map((r) => (
                      <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                    )) ?? "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => toggleActive(item.id, item.is_active)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Keine Einträge gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Tab 5: Terminologie ─────────────────────────────────────────────────────

function TerminologieTab() {
  const [items, setItems] = useState<HufiTerminology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("hufi_terminology")
        .select("id, term_de, term_en, term_latin, category, is_active")
        .order("term_de");
      if (err) throw err;
      setItems((data ?? []) as HufiTerminology[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      toast.error("Terminologie konnte nicht geladen werden: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from("hufi_terminology")
        .update({ is_active: !current })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      toast.success("Status aktualisiert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  const filtered = items.filter((i) => {
    const catOk = categoryFilter === "all" || i.category === categoryFilter;
    const q = search.toLowerCase();
    const searchOk =
      !q ||
      i.term_de.toLowerCase().includes(q) ||
      (i.term_en ?? "").toLowerCase().includes(q) ||
      (i.term_latin ?? "").toLowerCase().includes(q);
    return catOk && searchOk;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fachterminologie</CardTitle>
        <CardDescription>Alle Fachbegriffe im Hufi-Brain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Begriff suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deutsch</TableHead>
              <TableHead>Englisch</TableHead>
              <TableHead>Latein</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Aktiv</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingRows cols={5} />}
            {!loading && error && <ErrorRow cols={5} message={error} />}
            {!loading && !error && filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.term_de}</TableCell>
                <TableCell className="text-muted-foreground">{item.term_en ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground italic">{item.term_latin ?? "—"}</TableCell>
                <TableCell>{item.category ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => toggleActive(item.id, item.is_active)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Keine Einträge gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Tab 6: Keywords ─────────────────────────────────────────────────────────

interface NewKeywordForm {
  keyword: string;
  entity_type: string;
  entity_id: string;
}

function KeywordsTab() {
  const [items, setItems] = useState<HufiKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewKeywordForm>({
    keyword: "",
    entity_type: "",
    entity_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("hufi_keywords")
        .select("id, keyword, entity_type, entity_id, language, is_active")
        .order("keyword");
      if (err) throw err;
      setItems((data ?? []) as HufiKeyword[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      toast.error("Keywords konnten nicht geladen werden: " + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error: err } = await supabase
        .from("hufi_keywords")
        .update({ is_active: !current })
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
      toast.success("Status aktualisiert");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const deleteKeyword = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from("hufi_keywords")
        .delete()
        .eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success("Keyword gelöscht");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    }
  };

  const addKeyword = async () => {
    if (!form.keyword.trim()) {
      toast.error("Keyword darf nicht leer sein");
      return;
    }
    setSaving(true);
    try {
      const { data, error: err } = await supabase
        .from("hufi_keywords")
        .insert({
          keyword: form.keyword.trim(),
          entity_type: form.entity_type.trim() || null,
          entity_id: form.entity_id.trim() || null,
        })
        .select("id, keyword, entity_type, entity_id, language, is_active")
        .single();
      if (err) throw err;
      setItems((prev) => [...prev, data as HufiKeyword].sort((a, b) => a.keyword.localeCompare(b.keyword)));
      setForm({ keyword: "", entity_type: "", entity_id: "" });
      setShowForm(false);
      toast.success("Keyword hinzugefügt");
    } catch (e: unknown) {
      toast.error("Fehler: " + (e instanceof Error ? e.message : "Unbekannt"));
    } finally {
      setSaving(false);
    }
  };

  const entityTypes = Array.from(new Set(items.map((i) => i.entity_type).filter(Boolean))) as string[];
  const filtered = entityTypeFilter === "all"
    ? items
    : items.filter((i) => i.entity_type === entityTypeFilter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Keywords</CardTitle>
            <CardDescription>Alle Schlüsselwörter im Hufi-Brain</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            Neues Keyword
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="kw-keyword">Keyword *</Label>
                  <Input
                    id="kw-keyword"
                    placeholder="z.B. Hufrehe"
                    value={form.keyword}
                    onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kw-entity-type">Entity Type</Label>
                  <Input
                    id="kw-entity-type"
                    placeholder="z.B. health_condition"
                    value={form.entity_type}
                    onChange={(e) => setForm((p) => ({ ...p, entity_type: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kw-entity-id">Entity ID</Label>
                  <Input
                    id="kw-entity-id"
                    placeholder="UUID"
                    value={form.entity_id}
                    onChange={(e) => setForm((p) => ({ ...p, entity_id: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={addKeyword} disabled={saving}>
                  {saving ? "Speichern…" : "Hinzufügen"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Entity Types</SelectItem>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Sprache</TableHead>
              <TableHead>Aktiv</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <LoadingRows cols={6} />}
            {!loading && error && <ErrorRow cols={6} message={error} />}
            {!loading && !error && filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.keyword}</TableCell>
                <TableCell>
                  {item.entity_type
                    ? <Badge variant="outline" className="text-xs">{item.entity_type}</Badge>
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">
                  {item.entity_id ?? "—"}
                </TableCell>
                <TableCell>{item.language ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => toggleActive(item.id, item.is_active)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteKeyword(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Keine Keywords gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HufiBrainAdmin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/god-mode")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            God Mode
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Hufi Brain Wissen</h1>
              <p className="text-xs text-muted-foreground">
                Wissensdatenbank — Berufe, Rassen, Erkrankungen, Ausrüstung, Terminologie, Keywords
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs defaultValue="berufe">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="berufe">Berufe</TabsTrigger>
            <TabsTrigger value="rassen">Rassen</TabsTrigger>
            <TabsTrigger value="erkrankungen">Erkrankungen</TabsTrigger>
            <TabsTrigger value="ausruestung">Ausrüstung</TabsTrigger>
            <TabsTrigger value="terminologie">Terminologie</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
          </TabsList>

          <TabsContent value="berufe">
            <BerufeTab />
          </TabsContent>

          <TabsContent value="rassen">
            <RassenTab />
          </TabsContent>

          <TabsContent value="erkrankungen">
            <ErkrankungenTab />
          </TabsContent>

          <TabsContent value="ausruestung">
            <AusruestungTab />
          </TabsContent>

          <TabsContent value="terminologie">
            <TerminologieTab />
          </TabsContent>

          <TabsContent value="keywords">
            <KeywordsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
