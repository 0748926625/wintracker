-- WINTRACKER — correction du statut d'un colis par un super admin.
-- LIVRÉ est un statut final pour le flux normal : un colis marqué livré par
-- erreur ne pouvait plus être corrigé. Un super admin peut désormais amener
-- un colis à n'importe quel statut, avec un motif obligatoire. Les étapes
-- défaites restent dans l'historique, marquées annulées (et ne comptent plus
-- dans les bilans agents) ; la correction elle-même y est tracée.

alter table package_events add column cancelled_at timestamptz;
alter table package_events add column is_correction boolean not null default false;

comment on column package_events.cancelled_at is
  'Renseignée quand l''étape a été défaite par une correction de statut : conservée pour la traçabilité, ignorée dans les bilans.';
comment on column package_events.is_correction is
  'Vrai pour l''événement créé par une correction de statut (super admin), dont le motif est dans comment.';

create or replace function packages_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> old.status then
    -- Correction par un super admin (via correct_package_status) : toute
    -- transition est permise, y compris revenir en arrière depuis LIVRÉ.
    if coalesce(current_setting('wintracker.status_correction', true), '') = 'on' and is_super_admin() then
      if new.status <> 'LIVRE' then
        new.delivered_at := null;
      end if;
    elsif not is_valid_status_transition(old.status, new.status) then
      raise exception 'Transition de statut invalide: % -> %', old.status, new.status;
    end if;

    if new.status = 'LIVRE' and new.delivered_at is null then
      new.delivered_at := now();
    end if;
  end if;

  if new.created_at is distinct from old.created_at and not is_super_admin() then
    raise exception 'Seul un super admin peut modifier la date de création d''un colis';
  end if;

  -- Un livreur ne peut modifier que le statut (et delivered_at qui en découle) :
  -- jamais la compagnie, l'affectation, les informations expéditeur/destinataire,
  -- ni la date de prise en compte (réservée admin/agent).
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
      or new.count_date is distinct from old.count_date
    then
      raise exception 'Un livreur ne peut modifier que le statut du colis';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Seul un super admin peut annuler une étape ou marquer une correction : les
-- agents et livreurs ont le droit de modifier les événements (commentaire,
-- position GPS), pas ces deux colonnes.
create or replace function package_events_protect_correction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_super_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.cancelled_at is not null or new.is_correction then
      raise exception 'Seul un super admin peut enregistrer une correction de statut';
    end if;
  elsif new.cancelled_at is distinct from old.cancelled_at
    or new.is_correction is distinct from old.is_correction then
    raise exception 'Seul un super admin peut annuler ou corriger une étape de l''historique';
  end if;
  return new;
end;
$$;

create trigger package_events_protect_correction_trigger
before insert or update on package_events
for each row execute function package_events_protect_correction();

create or replace function correct_package_status(
  p_package_id uuid,
  p_new_status package_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status package_status;
  v_anchor timestamptz;
begin
  if not is_super_admin() then
    raise exception 'Seul un super admin peut corriger le statut d''un colis';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Le motif de la correction est obligatoire';
  end if;

  select status into v_old_status from packages where id = p_package_id for update;
  if not found then
    raise exception 'Colis introuvable';
  end if;
  if v_old_status = p_new_status then
    raise exception 'Le colis a déjà ce statut';
  end if;

  -- Retour à un statut déjà atteint : les étapes enregistrées depuis ce
  -- dernier passage sont défaites, donc marquées annulées.
  select max(created_at) into v_anchor
  from package_events
  where package_id = p_package_id and new_status = p_new_status and cancelled_at is null;

  if v_anchor is not null then
    update package_events
    set cancelled_at = now()
    where package_id = p_package_id and cancelled_at is null and created_at > v_anchor;
  end if;

  perform set_config('wintracker.status_correction', 'on', true);
  update packages set status = p_new_status where id = p_package_id;
  perform set_config('wintracker.status_correction', 'off', true);

  -- L'événement vient d'être créé par packages_after_update.
  update package_events
  set is_correction = true, comment = 'Correction : ' || trim(p_reason)
  where id = (
    select id from package_events
    where package_id = p_package_id and new_status = p_new_status
    order by created_at desc
    limit 1
  );
end;
$$;
