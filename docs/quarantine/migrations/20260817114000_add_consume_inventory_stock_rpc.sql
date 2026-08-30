-- Atomarer Lagerabzug fuer Rechnungspositionen.
-- Alle angeforderten Artikel werden zuerst unter Row-Lock geprueft.
-- Bei fehlendem Bestand / fremdem Artikel bricht die gesamte Funktion ab,
-- sodass kein Teilabzug entstehen kann.

create or replace function public.consume_inventory_stock(p_items jsonb)
returns table (item_id uuid, current_stock integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_invalid_count integer;
  v_missing_count integer;
  v_insufficient_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_STOCK_ITEMS';
  end if;

  with requested as (
    select
      x.item_id,
      sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    group by x.item_id
  )
  select count(*)
  into v_invalid_count
  from requested
  where item_id is null or quantity is null or quantity <= 0;

  if v_invalid_count > 0 then
    raise exception 'INVALID_STOCK_QUANTITY';
  end if;

  -- Sperrt alle betroffenen eigenen Lagerzeilen fuer die Dauer dieses Aufrufs.
  perform 1
  from public.inventory_items i
  join (
    select x.item_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    group by x.item_id
  ) r on r.item_id = i.id
  where i.user_id = auth.uid()
  order by i.id
  for update of i;

  with requested as (
    select x.item_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    group by x.item_id
  )
  select count(*)
  into v_missing_count
  from requested r
  left join public.inventory_items i
    on i.id = r.item_id
   and i.user_id = auth.uid()
  where i.id is null;

  if v_missing_count > 0 then
    raise exception 'INVENTORY_ITEM_NOT_FOUND_OR_FORBIDDEN';
  end if;

  with requested as (
    select x.item_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    group by x.item_id
  )
  select count(*)
  into v_insufficient_count
  from requested r
  join public.inventory_items i
    on i.id = r.item_id
   and i.user_id = auth.uid()
  where i.current_stock < r.quantity;

  if v_insufficient_count > 0 then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  return query
  with requested as (
    select x.item_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    group by x.item_id
  ), updated as (
    update public.inventory_items i
    set current_stock = i.current_stock - r.quantity
    from requested r
    where i.id = r.item_id
      and i.user_id = auth.uid()
    returning i.id, i.current_stock
  )
  select updated.id, updated.current_stock
  from updated;
end;
$$;

revoke all on function public.consume_inventory_stock(jsonb) from public;
grant execute on function public.consume_inventory_stock(jsonb) to authenticated;

comment on function public.consume_inventory_stock(jsonb) is
  'Atomarer, RLS-gebundener Lagerabzug fuer aggregierte Materialmengen eines Providers.';
