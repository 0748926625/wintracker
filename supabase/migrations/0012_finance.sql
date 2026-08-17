-- WINTRACKER — volet financier.
--
-- Une compagnie touche une commission ("ses gains") pour chaque colis LIVRÉ
-- avec succès (jamais pour ECHEC/RETOUR), calculée selon son mode configuré :
--   RATE            : pourcentage du tarif du colis
--   FIXED_PER_TIER   : montant fixe selon le palier de tarif (1000/1500/2000/2500/3000)
--
-- CA Winner Express = somme des tarifs des colis livrés.
-- Bénéfice Winner Express = CA - somme des commissions versées aux compagnies.

create type commission_type as enum ('RATE', 'FIXED_PER_TIER');

-- Regroupement de compagnies pour les rapports financiers agrégés.
create table company_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table companies add column group_id uuid references company_groups(id) on delete set null;
alter table companies add column commission_type commission_type;
alter table companies add column commission_rate numeric(5,2);

create table company_commission_tiers (
  company_id uuid not null references companies(id) on delete cascade,
  price integer not null check (price in (1000, 1500, 2000, 2500, 3000)),
  amount integer not null check (amount >= 0),
  primary key (company_id, price)
);

-- RLS ------------------------------------------------------------------------

alter table company_groups enable row level security;
alter table company_commission_tiers enable row level security;

create policy company_groups_select on company_groups
for select using (
  is_super_admin()
  or exists (select 1 from companies c where c.group_id = company_groups.id and c.id = my_company_id())
);

create policy company_groups_all_super_admin on company_groups
for all using (is_super_admin()) with check (is_super_admin());

create policy company_commission_tiers_select on company_commission_tiers
for select using (is_super_admin() or company_id = my_company_id());

create policy company_commission_tiers_all_super_admin on company_commission_tiers
for all using (is_super_admin()) with check (is_super_admin());

-- Fonctions d'agrégation -------------------------------------------------------

-- Commission due à la compagnie pour un colis livré, selon son mode configuré.
create or replace function package_commission(
  p_price integer,
  p_commission_type commission_type,
  p_commission_rate numeric,
  p_tier_amount integer
)
returns numeric
language sql
immutable
as $$
  select case
    when p_commission_type = 'RATE' then round(p_price * coalesce(p_commission_rate, 0) / 100.0)
    when p_commission_type = 'FIXED_PER_TIER' then coalesce(p_tier_amount, 0)
    else 0
  end;
$$;

-- Réservée au SUPER_ADMIN : vue globale, par compagnie, ou par groupe.
create or replace function financial_summary_admin(
  p_company_id uuid default null,
  p_group_id uuid default null
)
returns table (
  revenue numeric,
  commission numeric,
  profit numeric,
  delivered_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Accès réservé au SUPER_ADMIN';
  end if;

  return query
  select
    coalesce(sum(p.price), 0)::numeric as revenue,
    coalesce(sum(package_commission(p.price, c.commission_type, c.commission_rate, t.amount)), 0)::numeric as commission,
    coalesce(sum(p.price), 0)::numeric
      - coalesce(sum(package_commission(p.price, c.commission_type, c.commission_rate, t.amount)), 0)::numeric as profit,
    count(*)::bigint as delivered_count
  from packages p
  join companies c on c.id = p.company_id
  left join company_commission_tiers t on t.company_id = p.company_id and t.price = p.price
  where p.status = 'LIVRE'
    and p.price is not null
    and (p_company_id is null or p.company_id = p_company_id)
    and (p_group_id is null or c.group_id = p_group_id);
end;
$$;

-- Accessible à un COMPANY_USER pour ses propres gains uniquement.
create or replace function financial_summary_company()
returns table (
  earnings numeric,
  delivered_count bigint
)
language plpgsql
as $$
declare
  cid uuid := my_company_id();
begin
  if cid is null then
    raise exception 'Aucune compagnie associée';
  end if;

  return query
  select
    coalesce(sum(package_commission(p.price, c.commission_type, c.commission_rate, t.amount)), 0)::numeric as earnings,
    count(*)::bigint as delivered_count
  from packages p
  join companies c on c.id = p.company_id
  left join company_commission_tiers t on t.company_id = p.company_id and t.price = p.price
  where p.status = 'LIVRE' and p.price is not null and p.company_id = cid;
end;
$$;
