-- WINTRACKER — numéro de suivi, transitions de statut, historique automatique

-- Fonctions utilitaires de rôle (utilisées par les triggers ET par les policies RLS
-- définies dans 0003_rls.sql). SECURITY DEFINER pour éviter la récursion RLS sur profiles.

create or replace function my_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where user_id = auth.uid();
$$;

create or replace function my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from profiles where user_id = auth.uid();
$$;

create or replace function my_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from drivers d
  join profiles p on p.id = d.profile_id
  where p.user_id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(my_role() = 'SUPER_ADMIN', false);
$$;

-- Compteur annuel pour le numéro de suivi -----------------------------------

create table tracking_counters (
  year int primary key,
  last_value int not null default 0
);

create or replace function generate_tracking_number()
returns text
language plpgsql
as $$
declare
  current_year int := extract(year from now());
  next_value int;
begin
  insert into tracking_counters (year, last_value)
  values (current_year, 1)
  on conflict (year) do update set last_value = tracking_counters.last_value + 1
  returning last_value into next_value;

  return 'WT-' || current_year || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function set_tracking_number()
returns trigger
language plpgsql
as $$
begin
  if new.tracking_number is null or new.tracking_number = '' then
    new.tracking_number := generate_tracking_number();
  end if;
  return new;
end;
$$;

create trigger packages_set_tracking_number
before insert on packages
for each row execute function set_tracking_number();

-- Transitions de statut autorisées ------------------------------------------

create or replace function is_valid_status_transition(old_status package_status, new_status package_status)
returns boolean
language sql
immutable
as $$
  select case
    when old_status = 'EN_ATTENTE' and new_status = 'RECUPERE' then true
    when old_status = 'RECUPERE' and new_status = 'EN_LIVRAISON' then true
    when old_status = 'EN_LIVRAISON' and new_status = 'LIVRE' then true
    when old_status = 'EN_LIVRAISON' and new_status = 'ECHEC' then true
    when old_status = 'ECHEC' and new_status = 'EN_LIVRAISON' then true
    when old_status = 'ECHEC' and new_status = 'RETOUR' then true
    else false
  end;
$$;

create or replace function packages_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status then
    if not is_valid_status_transition(old.status, new.status) then
      raise exception 'Transition de statut invalide: % -> %', old.status, new.status;
    end if;

    if new.status = 'LIVRE' and new.delivered_at is null then
      new.delivered_at := now();
    end if;
  end if;

  -- Un livreur ne peut modifier que le statut (et delivered_at qui en découle) :
  -- jamais la compagnie, l'affectation, ou les informations expéditeur/destinataire.
  if my_role() = 'DRIVER' then
    if new.company_id is distinct from old.company_id
      or new.driver_id is distinct from old.driver_id
      or new.tracking_number is distinct from old.tracking_number
      or new.sender_name is distinct from old.sender_name
      or new.sender_phone is distinct from old.sender_phone
      or new.recipient_name is distinct from old.recipient_name
      or new.recipient_phone is distinct from old.recipient_phone
      or new.delivery_address is distinct from old.delivery_address
      or new.description is distinct from old.description
    then
      raise exception 'Un livreur ne peut modifier que le statut du colis';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger packages_before_update_trigger
before update on packages
for each row execute function packages_before_update();

-- Historique automatique -----------------------------------------------------

create or replace function packages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into package_events (package_id, old_status, new_status, changed_by)
  values (new.id, null, new.status, auth.uid());
  return new;
end;
$$;

create trigger packages_after_insert_trigger
after insert on packages
for each row execute function packages_after_insert();

create or replace function packages_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status then
    insert into package_events (package_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger packages_after_update_trigger
after update on packages
for each row execute function packages_after_update();
