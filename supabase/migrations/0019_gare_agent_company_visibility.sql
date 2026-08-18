-- WINTRACKER — un compte compagnie doit pouvoir voir le nom de l'agent de
-- gare qui a remis un colis lui appartenant, sur l'écran de détail du colis.
-- Jusqu'ici gare_agents n'était lisible que par le SUPER_ADMIN et l'agent
-- Wintrack qui a créé la fiche : le join `agent:gare_agents(*)` renvoyait
-- systématiquement null pour un COMPANY_USER.

create policy gare_agents_select_company on gare_agents
for select using (
  my_role() = 'COMPANY_USER'
  and exists (
    select 1 from packages p
    where p.agent_id = gare_agents.id
    and p.company_id in (select my_company_ids())
  )
);
