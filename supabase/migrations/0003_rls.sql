-- WINTRACKER — Row Level Security
-- Règle absolue : une compagnie ne voit jamais les colis d'une autre compagnie.
-- La sécurité est appliquée ici, jamais uniquement côté frontend.
-- (Les fonctions utilitaires my_role/my_company_id/my_driver_id/is_super_admin
-- sont définies dans 0002_functions_triggers.sql, réutilisées ici par les policies.)

-- Activation RLS ---------------------------------------------------------------

alter table companies enable row level security;
alter table profiles enable row level security;
alter table drivers enable row level security;
alter table packages enable row level security;
alter table package_events enable row level security;
alter table delivery_proofs enable row level security;

-- companies ----------------------------------------------------------------------

create policy companies_select on companies
for select using (
  is_super_admin() or id = my_company_id()
);

create policy companies_all_super_admin on companies
for all using (is_super_admin()) with check (is_super_admin());

-- profiles -------------------------------------------------------------------------

create policy profiles_select_self on profiles
for select using (
  user_id = auth.uid() or is_super_admin()
);

create policy profiles_select_company_peers on profiles
for select using (
  role = 'COMPANY_USER' and company_id = my_company_id()
);

-- Permet à une compagnie de voir le nom du livreur affecté à l'un de ses colis
-- (colonne "Livreur" de la liste des colis).
create policy profiles_select_assigned_driver on profiles
for select using (
  role = 'DRIVER'
  and my_role() = 'COMPANY_USER'
  and exists (
    select 1 from drivers d
    join packages p on p.driver_id = d.id
    where d.profile_id = profiles.id
    and p.company_id = my_company_id()
  )
);

create policy profiles_all_super_admin on profiles
for all using (is_super_admin()) with check (is_super_admin());

-- drivers -------------------------------------------------------------------------

-- Utilise my_driver_id() (SECURITY DEFINER) plutôt qu'une sous-requête directe sur
-- profiles : une sous-requête ordinaire ici re-déclencherait le RLS de profiles, qui
-- (via profiles_select_assigned_driver) interroge à nouveau drivers => récursion infinie.
create policy drivers_select_self on drivers
for select using (
  is_super_admin() or id = my_driver_id()
);

-- Permet à une compagnie de voir le livreur affecté à l'un de ses colis.
create policy drivers_select_for_company_packages on drivers
for select using (
  my_role() = 'COMPANY_USER'
  and exists (
    select 1 from packages p
    where p.driver_id = drivers.id
    and p.company_id = my_company_id()
  )
);

create policy drivers_all_super_admin on drivers
for all using (is_super_admin()) with check (is_super_admin());

-- packages -----------------------------------------------------------------------

create policy packages_select_super_admin on packages
for select using (is_super_admin());

create policy packages_select_company on packages
for select using (my_role() = 'COMPANY_USER' and company_id = my_company_id());

create policy packages_select_driver on packages
for select using (my_role() = 'DRIVER' and driver_id = my_driver_id());

create policy packages_insert_super_admin on packages
for insert with check (is_super_admin());

create policy packages_update_super_admin on packages
for update using (is_super_admin()) with check (is_super_admin());

create policy packages_update_driver on packages
for update using (my_role() = 'DRIVER' and driver_id = my_driver_id())
with check (my_role() = 'DRIVER' and driver_id = my_driver_id());

-- package_events -------------------------------------------------------------------

create policy package_events_select_super_admin on package_events
for select using (is_super_admin());

create policy package_events_select_company on package_events
for select using (
  exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and my_role() = 'COMPANY_USER'
    and p.company_id = my_company_id()
  )
);

create policy package_events_select_driver on package_events
for select using (
  exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and my_role() = 'DRIVER'
    and p.driver_id = my_driver_id()
  )
);

-- Les événements sont normalement créés par les triggers (SECURITY DEFINER, table
-- possédée par postgres => contourne RLS). Cette policy ne fait que couvrir le cas
-- d'un insert direct par un rôle autorisé (défense en profondeur).
-- Permet au livreur de compléter le commentaire (motif d'échec) sur un événement
-- qu'il vient de créer pour un de ses colis.
create policy package_events_update_driver on package_events
for update using (
  exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and my_role() = 'DRIVER'
    and p.driver_id = my_driver_id()
  )
) with check (
  exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and my_role() = 'DRIVER'
    and p.driver_id = my_driver_id()
  )
);

create policy package_events_update_super_admin on package_events
for update using (is_super_admin()) with check (is_super_admin());

create policy package_events_insert on package_events
for insert with check (
  is_super_admin()
  or (
    my_role() = 'DRIVER'
    and exists (
      select 1 from packages p
      where p.id = package_events.package_id
      and p.driver_id = my_driver_id()
    )
  )
);

-- delivery_proofs -------------------------------------------------------------------

create policy delivery_proofs_select_super_admin on delivery_proofs
for select using (is_super_admin());

create policy delivery_proofs_select_company on delivery_proofs
for select using (
  exists (
    select 1 from packages p
    where p.id = delivery_proofs.package_id
    and my_role() = 'COMPANY_USER'
    and p.company_id = my_company_id()
  )
);

create policy delivery_proofs_select_driver on delivery_proofs
for select using (
  exists (
    select 1 from packages p
    where p.id = delivery_proofs.package_id
    and my_role() = 'DRIVER'
    and p.driver_id = my_driver_id()
  )
);

create policy delivery_proofs_insert_driver on delivery_proofs
for insert with check (
  exists (
    select 1 from packages p
    where p.id = delivery_proofs.package_id
    and my_role() = 'DRIVER'
    and p.driver_id = my_driver_id()
  )
);

create policy delivery_proofs_all_super_admin on delivery_proofs
for all using (is_super_admin()) with check (is_super_admin());
