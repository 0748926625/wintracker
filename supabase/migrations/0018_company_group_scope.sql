-- WINTRACKER — centralise les infos pour un COMPANY_USER qui gère plusieurs
-- succursales d'une même compagnie (ex: UTB Yopougon + UTB Cocody), regroupées
-- via companies.group_id (company_groups). Le profil garde une seule compagnie
-- "de rattachement" (company_id), mais voit désormais les colis/finances de
-- toutes les compagnies partageant son groupe.

-- Ensemble des compagnies visibles pour le COMPANY_USER connecté : sa compagnie
-- de rattachement, plus toutes celles de son groupe (s'il en a un).
create or replace function my_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from companies
  where id = my_company_id()
     or group_id is not null and group_id = (
       select group_id from companies where id = my_company_id()
     )
$$;

-- companies : voir aussi les compagnies sœurs du même groupe.
drop policy companies_select on companies;
create policy companies_select on companies
for select using (
  is_super_admin() or id in (select my_company_ids())
);

-- company_commission_tiers : nécessaires pour calculer les commissions des
-- colis appartenant aux compagnies sœurs.
drop policy company_commission_tiers_select on company_commission_tiers;
create policy company_commission_tiers_select on company_commission_tiers
for select using (
  is_super_admin() or company_id in (select my_company_ids())
);

-- profiles : voir les collègues de toutes les succursales du groupe.
drop policy profiles_select_company_peers on profiles;
create policy profiles_select_company_peers on profiles
for select using (
  role = 'COMPANY_USER' and company_id in (select my_company_ids())
);

drop policy profiles_select_assigned_driver on profiles;
create policy profiles_select_assigned_driver on profiles
for select using (
  role = 'DRIVER'
  and my_role() = 'COMPANY_USER'
  and exists (
    select 1 from drivers d
    join packages p on p.driver_id = d.id
    where d.profile_id = profiles.id
    and p.company_id in (select my_company_ids())
  )
);

-- drivers : livreurs affectés à un colis de n'importe quelle succursale du groupe.
drop policy drivers_select_for_company_packages on drivers;
create policy drivers_select_for_company_packages on drivers
for select using (
  my_role() = 'COMPANY_USER'
  and exists (
    select 1 from packages p
    where p.driver_id = drivers.id
    and p.company_id in (select my_company_ids())
  )
);

-- packages : tous les colis des compagnies du groupe.
drop policy packages_select_company on packages;
create policy packages_select_company on packages
for select using (my_role() = 'COMPANY_USER' and company_id in (select my_company_ids()));

-- package_events
drop policy package_events_select_company on package_events;
create policy package_events_select_company on package_events
for select using (
  exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and my_role() = 'COMPANY_USER'
    and p.company_id in (select my_company_ids())
  )
);

-- delivery_proofs
drop policy delivery_proofs_select_company on delivery_proofs;
create policy delivery_proofs_select_company on delivery_proofs
for select using (
  exists (
    select 1 from packages p
    where p.id = delivery_proofs.package_id
    and my_role() = 'COMPANY_USER'
    and p.company_id in (select my_company_ids())
  )
);

-- storage : photos de preuve de livraison des colis du groupe.
drop policy delivery_proofs_read on storage.objects;
create policy delivery_proofs_read on storage.objects
for select using (
  bucket_id = 'delivery-proofs'
  and (
    is_super_admin()
    or exists (
      select 1 from packages p
      where p.id = package_id_from_storage_path(name)
      and (
        (my_role() = 'COMPANY_USER' and p.company_id in (select my_company_ids()))
        or (my_role() = 'DRIVER' and p.driver_id = my_driver_id())
      )
    )
  )
);

-- financial_summary_company : gains agrégés sur tout le groupe, pas seulement
-- la compagnie de rattachement.
create or replace function financial_summary_company()
returns table (
  earnings numeric,
  delivered_count bigint
)
language plpgsql
as $$
begin
  if my_company_id() is null then
    raise exception 'Aucune compagnie associée';
  end if;

  return query
  select
    coalesce(sum(package_commission(p.price, c.commission_type, c.commission_rate, t.amount)), 0)::numeric as earnings,
    count(*)::bigint as delivered_count
  from packages p
  join companies c on c.id = p.company_id
  left join company_commission_tiers t on t.company_id = p.company_id and t.price = p.price
  where p.status = 'LIVRE' and p.price is not null and p.company_id in (select my_company_ids());
end;
$$;
