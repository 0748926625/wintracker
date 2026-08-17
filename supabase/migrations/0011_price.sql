-- WINTRACKER — tarif de la livraison, choisi parmi une liste fixe (FCFA).
-- Contrainte au niveau base pour ne jamais dépendre uniquement du frontend.

alter table packages add column price integer;

alter table packages add constraint packages_price_allowed_values
  check (price is null or price in (1000, 1500, 2000, 2500, 3000));
