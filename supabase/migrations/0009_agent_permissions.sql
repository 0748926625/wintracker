-- WINTRACKER — droits du rôle AGENT.
--
-- Un agent peut : créer des colis, les affecter à un livreur, voir tous les
-- colis (toutes compagnies) et leur historique.
-- Un agent ne peut pas : gérer les compagnies, gérer les livreurs, créer des
-- comptes (réservé au SUPER_ADMIN, via la même Edge Function admin-create-user).

-- Champ colis : quel agent de la structure a enregistré/gère ce colis.
alter table packages add column agent_id uuid references profiles(id) on delete set null;

-- companies : lecture seule (nécessaire pour choisir la compagnie à la création d'un colis).
create policy companies_select_agent on companies
for select using (my_role() = 'AGENT');

-- drivers : lecture seule (nécessaire pour affecter un livreur).
create policy drivers_select_agent on drivers
for select using (my_role() = 'AGENT');

-- profiles : un agent doit pouvoir résoudre les noms des livreurs et des autres
-- agents (listes déroulantes), jamais plus.
create policy profiles_select_driver_for_agent on profiles
for select using (role = 'DRIVER' and my_role() = 'AGENT');

create policy profiles_select_agent_peers on profiles
for select using (role = 'AGENT' and my_role() = 'AGENT');

-- packages : mêmes droits que le SUPER_ADMIN sur les colis (créer, modifier,
-- affecter, tout voir) — jamais sur les compagnies/livreurs eux-mêmes.
create policy packages_select_agent on packages
for select using (my_role() = 'AGENT');

create policy packages_insert_agent on packages
for insert with check (my_role() = 'AGENT');

create policy packages_update_agent on packages
for update using (my_role() = 'AGENT') with check (my_role() = 'AGENT');

create policy package_events_select_agent on package_events
for select using (my_role() = 'AGENT');

create policy delivery_proofs_select_agent on delivery_proofs
for select using (my_role() = 'AGENT');
