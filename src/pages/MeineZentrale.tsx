import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  User, Shield, ChevronRight, Edit2, Check, X,
  Crown, Users, Lock, Briefcase, Link2, LogOut,
} from "lucide-react";

const LOGO = "https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png";

export default function MeineZentrale() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // ── Profile data ───────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery({
    queryKey: ["meine-zentrale", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, company_name, readable_id, subscription_plan, subscription_status, city")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // ── Employee profile (for employee role) ──────────────────────────
  const { data: empProfile } = useQuery({
    queryKey: ["emp-zentrale", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_profiles")
        .select("id, full_name, phone, avatar_url, provider_id, permissions, provider:profiles!provider_id(full_name, company_name, readable_id)")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && role === "employee",
  });

  // ── Team members (for provider role) ─────────────────────────────
  const { data: team } = useQuery({
    queryKey: ["zentrale-team", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_profiles")
        .select("id, full_name, phone, avatar_url, permissions, is_active")
        .eq("provider_id", user!.id)
        .order("full_name");
      return data ?? [];
    },
    enabled: !!user && role === "provider",
  });

  // ── Connected providers (for client role) ─────────────────────────
  const { data: connections } = useQuery({
    queryKey: ["zentrale-connections", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("access_grants")
        .select("id, status, can_view_basic, can_view_medical, can_create_appointments, provider:profiles!provider_id(full_name, company_name, readable_id, city)")
        .eq("client_id", user!.id)
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!user && role === "client",
  });

  // ── Save profile field ──────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meine-zentrale", user?.id] });
      toast.success("Gespeichert");
      setEditField(null);
    },
    onError: () => toast.error("Speichern fehlgeschlagen"),
  });

  function startEdit(field: string, current: string | null) {
    setEditField(field);
    setEditValue(current ?? "");
  }

  function cancelEdit() { setEditField(null); setEditValue(""); }
  function confirmEdit(field: string) { save.mutate({ field, value: editValue }); }

  // ── Plan badge ─────────────────────────────────────────────────────
  const planLabel = profile?.subscription_plan === "pro" ? "PRO"
    : profile?.subscription_plan === "duo" ? "DUO"
    : profile?.subscription_plan === "team" ? "TEAM"
    : "STARTER";

  const planColor = profile?.subscription_plan === "pro" ? "#F97316"
    : profile?.subscription_plan === "duo" ? "#8B5CF6"
    : profile?.subscription_plan === "team" ? "#10B981"
    : "#6B7280";

  if (isLoading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F5" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F97316", padding: 8 }}>
        <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
      </div>
    </div>
  );

  const displayName = role === "employee"
    ? empProfile?.full_name ?? profile?.full_name ?? user?.email
    : profile?.full_name ?? user?.email;

  return (
    <div style={{ background: "#F5F5F5", minHeight: "100dvh", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #1a0e00 0%, #0a0700 100%)", padding: "32px 20px 60px", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <img src={LOGO} alt="Hufi" style={{ width: "55%", height: "55%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
              }
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>{displayName}</h1>
            {profile?.readable_id && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>#{profile.readable_id}</p>
            )}
          </div>

          {/* Role + plan badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#F97316", letterSpacing: ".05em", textTransform: "uppercase" }}>
              {role === "provider" ? "Profi" : role === "client" ? "Pferdebesitzer" : role === "employee" ? "Mitarbeiter" : role === "admin" ? "Admin" : "Nutzer"}
            </span>
            {role === "provider" && (
              <span style={{ background: `${planColor}22`, border: `1px solid ${planColor}55`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: planColor, letterSpacing: ".05em", textTransform: "uppercase" }}>
                {planLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: "0 16px", marginTop: -24, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Profile card */}
        <Card title="Mein Profil" icon={<User size={16} style={{ color: "#F97316" }} />}>
          <ProfileRow
            label="Name" value={profile?.full_name ?? ""}
            field="full_name" editField={editField} editValue={editValue}
            onEdit={() => startEdit("full_name", profile?.full_name ?? "")}
            onCancel={cancelEdit} onConfirm={() => confirmEdit("full_name")}
            onChange={setEditValue}
          />
          <ProfileRow
            label="Telefon" value={profile?.phone ?? ""}
            field="phone" editField={editField} editValue={editValue}
            onEdit={() => startEdit("phone", profile?.phone ?? "")}
            onCancel={cancelEdit} onConfirm={() => confirmEdit("phone")}
            onChange={setEditValue}
            type="tel"
          />
          <ProfileRow
            label="E-Mail" value={profile?.email ?? user?.email ?? ""}
            field="email" editField={null} editValue=""
            onEdit={() => {}} onCancel={() => {}} onConfirm={() => {}} onChange={() => {}}
            readonly
          />
          {(role === "provider") && (
            <ProfileRow
              label="Betrieb" value={profile?.company_name ?? ""}
              field="company_name" editField={editField} editValue={editValue}
              onEdit={() => startEdit("company_name", profile?.company_name ?? "")}
              onCancel={cancelEdit} onConfirm={() => confirmEdit("company_name")}
              onChange={setEditValue}
            />
          )}
        </Card>

        {/* Provider: Team & Permissions */}
        {role === "provider" && (
          <Card title="Mein Team" icon={<Users size={16} style={{ color: "#8B5CF6" }} />}
            action={{ label: "Verwalten", onClick: () => navigate("/management") }}>
            {!team || team.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, padding: "8px 0" }}>
                Noch keine Mitarbeiter. Lade dein Team ein!
              </p>
            ) : (
              team.slice(0, 5).map((emp) => (
                <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {emp.avatar_url
                      ? <img src={emp.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <User size={16} style={{ color: "#9CA3AF" }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>{emp.full_name}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                      {emp.is_active ? "Aktiv" : "Inaktiv"}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, background: emp.is_active ? "rgba(16,185,129,0.12)" : "#F3F4F6", color: emp.is_active ? "#10B981" : "#9CA3AF", borderRadius: 20, padding: "3px 8px", fontWeight: 600 }}>
                    {emp.is_active ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              ))
            )}
            <NavRow label="Mitarbeiter einladen" onClick={() => navigate("/kunden")} icon={<Users size={15} />} />
          </Card>
        )}

        {/* Provider: Subscription */}
        {role === "provider" && (
          <Card title="Abo & Zugang" icon={<Crown size={16} style={{ color: planColor }} />}
            action={{ label: "Verwalten", onClick: () => navigate("/management/abo") }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>Hufi {planLabel}</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>
                  {profile?.subscription_status === "active" ? "Aktiv" : profile?.subscription_status ?? "—"}
                </p>
              </div>
              <span style={{ background: `${planColor}22`, color: planColor, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>{planLabel}</span>
            </div>
          </Card>
        )}

        {/* Client: Connected experts */}
        {role === "client" && (
          <Card title="Verbundene Experten" icon={<Link2 size={16} style={{ color: "#3B82F6" }} />}
            action={{ label: "Hufi Connect", onClick: () => navigate("/hm-connect") }}>
            {!connections || connections.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, padding: "8px 0" }}>
                Noch keine Verbindungen. Finde deinen Hufpfleger über Hufi Connect!
              </p>
            ) : (
              (connections as Array<{
                id: string;
                can_view_basic: boolean | null;
                can_view_medical: boolean | null;
                can_create_appointments: boolean | null;
                provider: { full_name: string; company_name?: string | null; readable_id?: string | null; city?: string | null } | null;
              }>).map((conn) => (
                <div key={conn.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 6 }}>
                    <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>{conn.provider?.full_name ?? "Unbekannt"}</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" }}>{conn.provider?.city ?? ""}</p>
                  </div>
                  <PermissionDots basic={conn.can_view_basic} medical={conn.can_view_medical} appts={conn.can_create_appointments} />
                </div>
              ))
            )}
          </Card>
        )}

        {/* Employee: My employer + permissions */}
        {role === "employee" && empProfile && (
          <Card title="Mein Arbeitgeber" icon={<Briefcase size={16} style={{ color: "#10B981" }} />}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, flexShrink: 0 }}>
                <img src={LOGO} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                  {(empProfile.provider as { company_name?: string | null; full_name?: string } | null)?.company_name
                    ?? (empProfile.provider as { full_name?: string } | null)?.full_name ?? "Betrieb"}
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                  #{(empProfile.provider as { readable_id?: string | null } | null)?.readable_id ?? "—"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {role === "employee" && (
          <Card title="Meine Berechtigungen" icon={<Shield size={16} style={{ color: "#6366F1" }} />}>
            {[
              { label: "Grunddaten einsehen", granted: true },
              { label: "Medizinische Daten", granted: !!(empProfile?.permissions as Record<string, boolean> | null)?.can_view_medical },
              { label: "Termine erstellen",  granted: !!(empProfile?.permissions as Record<string, boolean> | null)?.can_create_appointments },
            ].map((p) => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: p.granted ? "rgba(16,185,129,0.15)" : "rgba(156,163,175,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {p.granted
                    ? <Check size={11} style={{ color: "#10B981" }} />
                    : <X size={11} style={{ color: "#9CA3AF" }} />
                  }
                </div>
                <span style={{ fontSize: 13, color: p.granted ? "#1A1A1A" : "#9CA3AF" }}>{p.label}</span>
              </div>
            ))}
          </Card>
        )}

        {/* Quick links */}
        <Card title="Einstellungen" icon={<Lock size={16} style={{ color: "#6B7280" }} />}>
          <NavRow label="Einstellungen" onClick={() => navigate("/einstellungen")} icon={<ChevronRight size={15} />} />
          <NavRow label="Datenschutz & KI-Transparenz" onClick={() => navigate("/mein-hufi")} icon={<ChevronRight size={15} />} />
          {role === "provider" && <NavRow label="Business-Einstellungen" onClick={() => navigate("/business-einstellungen")} icon={<ChevronRight size={15} />} />}
          {role === "client" && <NavRow label="Datenschutz-Einstellungen" onClick={() => navigate("/datenschutz-einstellungen")} icon={<ChevronRight size={15} />} />}
          <NavRow label="Hufi Connect" onClick={() => navigate("/hm-connect")} icon={<ChevronRight size={15} />} />
        </Card>

        {/* Logout */}
        <button
          onClick={async () => { await signOut(); navigate("/auth"); }}
          style={{ width: "100%", height: 50, borderRadius: 14, background: "#FFFFFF", border: "1px solid #FEE2E2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" }}
        >
          <LogOut size={18} style={{ color: "#EF4444" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Abmelden</span>
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function Card({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 18, padding: "16px 16px 8px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{title}</span>
        </div>
        {action && (
          <button onClick={action.onClick} style={{ fontSize: 11, color: "#F97316", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {action.label} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ProfileRow({ label, value, field, editField, editValue, onEdit, onCancel, onConfirm, onChange, readonly, type }: {
  label: string; value: string; field: string; editField: string | null; editValue: string;
  onEdit: () => void; onCancel: () => void; onConfirm: () => void; onChange: (v: string) => void;
  readonly?: boolean; type?: string;
}) {
  const isEditing = editField === field;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F5F5F5" }}>
      <span style={{ fontSize: 11, color: "#9CA3AF", width: 68, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      {isEditing ? (
        <div style={{ display: "flex", flex: 1, gap: 8, alignItems: "center" }}>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            type={type ?? "text"}
            style={{ flex: 1, height: 34, borderRadius: 8, border: "1.5px solid #F97316", padding: "0 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
            onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onCancel(); }}
          />
          <button onClick={onConfirm} style={{ width: 28, height: 28, borderRadius: 8, background: "#10B981", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} style={{ color: "#FFF" }} /></button>
          <button onClick={onCancel}  style={{ width: 28, height: 28, borderRadius: 8, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} style={{ color: "#9CA3AF" }} /></button>
        </div>
      ) : (
        <>
          <span style={{ flex: 1, fontSize: 13, color: value ? "#1A1A1A" : "#D1D5DB", fontWeight: value ? 500 : 400 }}>
            {value || "Nicht angegeben"}
          </span>
          {!readonly && (
            <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 8, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Edit2 size={12} style={{ color: "#9CA3AF" }} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function NavRow({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid #F5F5F5", background: "none", border: "none", borderBottom: "1px solid #F5F5F5", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
      <span style={{ flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: 500 }}>{label}</span>
      {icon}
    </button>
  );
}

function PermissionDots({ basic, medical, appts }: { basic: boolean | null; medical: boolean | null; appts: boolean | null }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[basic, medical, appts].map((v, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: v ? "#10B981" : "#E5E7EB" }} />
      ))}
    </div>
  );
}
