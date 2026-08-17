-- WINTRACKER — restreint chaque agent Wintrack à une ou plusieurs compagnies.
-- Un agent ne voit/crée/fait progresser que les colis des compagnies qui lui
-- sont explicitement assignées. Sans compagnie assignée, il ne voit rien.

create or replace function my_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where user_id = auth.uid();
$$;

create table agent_companies (
  agent_profile_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (agent_profile_id, company_id)
);

alter table agent_companies enable row level security;

create policy agent_companies_select on agent_companies
for select using (is_super_admin() or agent_profile_id = my_profile_id());

create policy agent_companies_all_super_admin on agent_companies
for all using (is_super_admin()) with check (is_super_admin());

-- Ensemble des compagnies assignées à l'agent connecté (SECURITY DEFINER pour
-- contourner le RLS d'agent_companies/profiles et éviter toute récursion).
create or replace function my_agent_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ac.company_id
  from agent_companies ac
  join profiles p on p.id = ac.agent_profile_id
  where p.user_id = auth.uid();
$$;

-- companies : un agent ne voit que ses compagnies assignées.
drop policy companies_select_agent on companies;
create policy companies_select_agent on companies
for select using (my_role() = 'AGENT' and id in (select my_agent_company_ids()));

-- packages : idem pour voir, créer, modifier/faire progresser.
drop policy packages_select_agent on packages;
create policy packages_select_agent on packages
for select using (my_role() = 'AGENT' and company_id in (select my_agent_company_ids()));

drop policy packages_insert_agent on packages;
create policy packages_insert_agent on packages
for insert with check (my_role() = 'AGENT' and company_id in (select my_agent_company_ids()));

drop policy packages_update_agent on packages;
create policy packages_update_agent on packages
for update using (my_role() = 'AGENT' and company_id in (select my_agent_company_ids()))
with check (my_role() = 'AGENT' and company_id in (select my_agent_company_ids()));

-- package_events / delivery_proofs : visibles/actionnables seulement si le
-- colis parent appartient à une compagnie assignée à l'agent.
drop policy package_events_select_agent on package_events;
create policy package_events_select_agent on package_events
for select using (
  my_role() = 'AGENT'
  and exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and p.company_id in (select my_agent_company_ids())
  )
);

drop policy package_events_update_agent on package_events;
create policy package_events_update_agent on package_events
for update using (
  my_role() = 'AGENT'
  and exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and p.company_id in (select my_agent_company_ids())
  )
) with check (
  my_role() = 'AGENT'
  and exists (
    select 1 from packages p
    where p.id = package_events.package_id
    and p.company_id in (select my_agent_company_ids())
  )
);

drop policy delivery_proofs_select_agent on delivery_proofs;
create policy delivery_proofs_select_agent on delivery_proofs
for select using (
  my_role() = 'AGENT'
  and exists (
    select 1 from packages p
    where p.id = delivery_proofs.package_id
    and p.company_id in (select my_agent_company_ids())
  )
);

drop policy delivery_proofs_insert_agent on delivery_proofs;
create policy delivery_proofs_insert_agent on delivery_proofs
for insert with check (
  my_role() = 'AGENT'
  and exists (
    select 1 from packages p
    where p.id = delivery_proofs.package_id
    and p.company_id in (select my_agent_company_ids())
  )
);
