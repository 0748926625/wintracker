-- WINTRACKER — trace qui (quel compte Agent Wintrack ou Super Admin) a
-- enregistré chaque colis, pour l'afficher dans le détail du colis.
-- Rempli automatiquement par trigger (jamais par le client) : les colis déjà
-- existants restent avec created_by = null, valeur historique inconnue.

alter table packages add column created_by uuid references profiles(id) on delete set null;

create or replace function set_package_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := my_profile_id();
  return new;
end;
$$;

create trigger packages_set_creator
before insert on packages
for each row execute function set_package_creator();

-- Permet à un compte compagnie de voir le nom (et le rôle) de la personne
-- qui a créé un colis lui appartenant, via l'embed `creator:profiles(*)`.
create policy profiles_select_package_creator on profiles
for select using (
  my_role() = 'COMPANY_USER'
  and exists (
    select 1 from packages p
    where p.created_by = profiles.id
    and p.company_id in (select my_company_ids())
  )
);
