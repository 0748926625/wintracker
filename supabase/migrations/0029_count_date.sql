-- WINTRACKER — un colis relivré après un RETOUR reste compté, dans les
-- bilans/classements, à sa date de création initiale. Ça peut fausser les
-- stats de la période où la livraison a réellement abouti. On ajoute une
-- date de prise en compte optionnelle (réservée admin/agent) qui prime sur
-- created_at partout où une période est calculée.

alter table packages add column count_date timestamptz;

comment on column packages.count_date is
  'Date de prise en compte pour les bilans/classements (remplace created_at quand renseignée). Sert notamment pour un colis relivré après un RETOUR, afin de ne pas fausser les stats de la période initiale.';

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
