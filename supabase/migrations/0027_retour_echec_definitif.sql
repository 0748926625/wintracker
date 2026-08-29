-- WINTRACKER — depuis RETOUR, on peut désormais marquer directement un
-- échec définitif (avec motif) sans repasser par un cycle complet de
-- livraison. Rend le bouton "ÉCHEC" plus évident et évite la confusion
-- entre "tentative en cours" et "abandon définitif".

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
    when old_status = 'RETOUR' and new_status = 'ECHEC' then true
    else false
  end;
$$;
