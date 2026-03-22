import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function SignupFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("email_signup_forms")
      .select("*")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setError("Formular nicht gefunden");
        else setForm(data);
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("email_subscribers").insert({
      list_id: form.list_id,
      email: email.trim(),
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      postal_code: postalCode.trim() || null,
      source: "signup_form",
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") setError("Diese E-Mail ist bereits angemeldet.");
      else setError("Fehler beim Anmelden. Bitte versuche es erneut.");
    } else {
      setSubmitted(true);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#F47B20]" />
    </div>
  );

  if (error && !form) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-muted-foreground">{error}</p>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <Card className="bg-white rounded-xl shadow-sm max-w-md w-full mx-4">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <p className="text-lg font-medium text-black">Erfolgreich angemeldet!</p>
          <p className="text-sm text-muted-foreground">Vielen Dank für deine Anmeldung.</p>
        </CardContent>
      </Card>
    </div>
  );

  const fields = form.fields_config || {};

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <Card className="bg-white rounded-xl shadow-sm max-w-md w-full">
        <CardContent className="pt-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-lg font-medium text-black text-center">{form.heading_text || "Newsletter abonnieren"}</p>
            <Input
              type="email"
              placeholder="E-Mail *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white"
            />
            {fields.first_name && (
              <Input placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white" />
            )}
            {fields.last_name && (
              <Input placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white" />
            )}
            {fields.postal_code && (
              <Input placeholder="PLZ" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="bg-white" />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-[#F47B20] hover:bg-[#e06a10] text-white" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {form.button_text || "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
