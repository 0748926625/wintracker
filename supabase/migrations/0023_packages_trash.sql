-- WINTRACKER — corbeille de colis. La suppression devient réversible : elle
-- marque le colis comme supprimé (deleted_at) au lieu de le retirer
-- définitivement. La purge réelle (DELETE) reste un acte séparé, réservé au
-- Super Admin (migration 0021), déclenché depuis la corbeille.
--
-- Le droit "can_delete_packages" d'un agent (migration 0022) devenait jusqu'ici
-- un DELETE direct et irréversible : on le fait maintenant pointer vers la
-- corbeille (mettre à la corbeille / restaurer), plus jamais vers une purge.

alter table packages add column deleted_at timestamptz;

drop policy packages_delete_agent on packages;

-- Les policies UPDATE existantes (packages_update_super_admin,
-- packages_update_agent) autorisent la modification de n'importe quelle
-- colonne dès lors que le colis est dans leur périmètre : sans ce trigger,
-- un agent sans can_delete_packages pourrait mettre un colis à la corbeille
-- en appelant directement l'API sur la colonne deleted_at.
create or replace function enforce_package_delete_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    if not (
      is_super_admin()
      or (
        my_role() = 'AGENT'
        and agent_can_delete_packages()
        and old.company_id in (select my_agent_company_ids())
      )
    ) then
      raise exception 'Droits insuffisants pour modifier la corbeille de ce colis';
    end if;
  end if;
  return new;
end;
$$;

create trigger packages_enforce_delete_permission
before update on packages
for each row execute function enforce_package_delete_permission();
