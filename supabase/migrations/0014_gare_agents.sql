-- WINTRACKER — remplace le carnet d'expéditeur "par compagnie" par un carnet
-- global "agent de gare" : simple liste de noms (sans compte de connexion),
-- utilisée uniquement pour préremplir le champ "Agent de la gare" du formulaire
-- de création de colis. Les comptes AGENT avec identifiants (page "Agents de
-- gare") restent inchangés, pour ceux qui ont besoin d'utiliser l'application.

drop table company_agents;

create table gare_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table gare_agents enable row level security;

create policy gare_agents_select on gare_agents
for select using (is_super_admin() or my_role() = 'AGENT');

create policy gare_agents_insert on gare_agents
for insert with check (is_super_admin() or my_role() = 'AGENT');

create policy gare_agents_update_super_admin on gare_agents
for update using (is_super_admin()) with check (is_super_admin());

create policy gare_agents_delete_super_admin on gare_agents
for delete using (is_super_admin());

-- packages.agent_id pointait vers profiles (comptes AGENT) ; il pointe
-- désormais vers ce nouveau carnet sans compte.
alter table packages drop constraint packages_agent_id_fkey;
alter table packages add constraint packages_agent_id_fkey
  foreign key (agent_id) references gare_agents(id) on delete set null;
