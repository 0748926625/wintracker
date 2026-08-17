-- WINTRACKER — carnet d'expéditeurs par compagnie.
-- Ce ne sont PAS des comptes (pas d'email/mot de passe, pas de connexion) :
-- juste une liste de noms/téléphones réutilisables pour préremplir le formulaire
-- de création de colis (champ expéditeur), propre à chaque compagnie partenaire.

create table company_agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create index company_agents_company_id_idx on company_agents(company_id);

alter table company_agents enable row level security;

create policy company_agents_select on company_agents
for select using (
  is_super_admin() or my_role() = 'AGENT' or company_id = my_company_id()
);

-- Un agent Winner Express peut ajouter un nouveau contact à la volée depuis le
-- formulaire de création de colis, mais ne peut pas modifier/supprimer l'existant.
create policy company_agents_insert on company_agents
for insert with check (is_super_admin() or my_role() = 'AGENT');

create policy company_agents_update_delete_super_admin on company_agents
for update using (is_super_admin()) with check (is_super_admin());

create policy company_agents_delete_super_admin on company_agents
for delete using (is_super_admin());
