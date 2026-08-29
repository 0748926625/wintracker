-- WINTRACKER — un colis RETOUR était un cul-de-sac (aucune transition
-- autorisée). On permet désormais de retenter une livraison depuis RETOUR ;
-- si cette nouvelle tentative échoue, le livreur la marque ÉCHEC comme pour
-- toute tentative de livraison (transition déjà autorisée).

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
    when old_status = 'RETOUR' and new_status = 'EN_LIVRAISON' then true
    else false
  end;
$$;
