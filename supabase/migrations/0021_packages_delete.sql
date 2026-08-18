-- WINTRACKER — permet au Super Admin de supprimer des colis, nécessaire à
-- la suppression forcée d'une compagnie (bouton dédié, mot de passe de
-- confirmation côté interface). Jusqu'ici aucune policy DELETE n'existait
-- sur packages : même le Super Admin ne pouvait pas en supprimer.
-- package_events et delivery_proofs suivent automatiquement (on delete cascade).

create policy packages_delete_super_admin on packages
for delete using (is_super_admin());
