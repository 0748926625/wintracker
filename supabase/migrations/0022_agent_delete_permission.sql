-- WINTRACKER — permet au Super Admin d'accorder à un agent Wintrack le droit
-- de supprimer un colis (ex: corriger une erreur d'attribution de compagnie
-- sans passer par le Super Admin). Désactivé par défaut pour tout agent.

alter table profiles add column can_delete_packages boolean not null default false;

create or replace function agent_can_delete_packages()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.can_delete_packages from profiles p where p.user_id = auth.uid()),
    false
  );
$$;

create policy packages_delete_agent on packages
for delete using (
  my_role() = 'AGENT'
  and company_id in (select my_agent_company_ids())
  and agent_can_delete_packages()
);
