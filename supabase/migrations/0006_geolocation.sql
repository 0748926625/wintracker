-- WINTRACKER — position GPS ponctuelle à la récupération et à la livraison.
-- Pas de suivi continu : juste un point horodaté par événement, affiché ensuite
-- via un lien Google Maps (pas de clé API, pas de coût).

alter table package_events add column latitude double precision;
alter table package_events add column longitude double precision;

-- Change le statut d'un colis et attache une position GPS à l'événement créé.
-- Fonction SECURITY INVOKER (par défaut) : l'update sur packages et sur
-- package_events passe par les policies RLS existantes (packages_update_driver,
-- package_events_update_driver), donc aucun contournement de sécurité ici.
create or replace function set_package_status(
  p_package_id uuid,
  p_new_status package_status,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns packages
language plpgsql
as $$
declare
  result packages;
  target_event_id uuid;
begin
  update packages set status = p_new_status where id = p_package_id
  returning * into result;

  if p_latitude is not null and p_longitude is not null then
    select id into target_event_id
    from package_events
    where package_id = p_package_id and new_status = p_new_status
    order by created_at desc
    limit 1;

    update package_events
    set latitude = p_latitude, longitude = p_longitude
    where id = target_event_id;
  end if;

  return result;
end;
$$;
