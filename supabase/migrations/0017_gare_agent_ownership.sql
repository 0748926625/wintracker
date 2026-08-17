-- WINTRACKER —
-- 1) permet de supprimer un compte utilisateur (agent, compagnie, livreur)
--    même s'il a déjà modifié des colis : l'historique reste, changed_by devient NULL.
-- 2) chaque agent Wintrack ne voit/ajoute que les agents de gare (carnet sans
--    compte) qu'il a lui-même renseignés, jamais ceux ajoutés par un autre agent.

alter table package_events drop constraint package_events_changed_by_fkey;
alter table package_events add constraint package_events_changed_by_fkey
  foreign key (changed_by) references auth.users(id) on delete set null;

alter table gare_agents add column created_by_agent_id uuid references profiles(id) on delete set null;

create or replace function set_gare_agent_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by_agent_id := my_profile_id();
  return new;
end;
$$;

create trigger gare_agents_set_owner
before insert on gare_agents
for each row execute function set_gare_agent_owner();

drop policy gare_agents_select on gare_agents;
create policy gare_agents_select on gare_agents
for select using (
  is_super_admin() or (my_role() = 'AGENT' and created_by_agent_id = my_profile_id())
);
