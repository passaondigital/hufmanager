-- Cross-User-Berufs-Aggregat (M3): anonymisiert, KEINE User-Verknüpfung.
-- Zählt je Beruf, welche Herausforderungen Nutzer im Onboarding nennen.
-- DSGVO: nur aggregierte Zähler, kein Personenbezug, kein user_id.

create table if not exists public.profession_insights (
  profession_type text not null,
  challenge_key   text not null,
  count           integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (profession_type, challenge_key)
);

alter table public.profession_insights enable row level security;

-- Lesen: alle Authentifizierten dürfen die anonymen Aggregate sehen.
drop policy if exists "profession_insights readable by authenticated" on public.profession_insights;
create policy "profession_insights readable by authenticated"
  on public.profession_insights for select
  to authenticated
  using (true);

-- Kein direktes Schreiben durch Clients — nur über die SECURITY DEFINER RPC unten.

-- Increment-RPC: zählt je Herausforderung +1, vollständig anonym.
create or replace function public.increment_profession_insights(
  _profession_type text,
  _challenge_keys   text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare k text;
begin
  if _profession_type is null or _challenge_keys is null then
    return;
  end if;
  foreach k in array _challenge_keys loop
    insert into public.profession_insights (profession_type, challenge_key, count, updated_at)
    values (_profession_type, k, 1, now())
    on conflict (profession_type, challenge_key)
    do update set count = public.profession_insights.count + 1, updated_at = now();
  end loop;
end;
$$;

grant execute on function public.increment_profession_insights(text, text[]) to authenticated;
