-- WINTRACKER — pour la v1, les livreurs n'utilisent pas l'application : c'est
-- l'agent de gare qui, sur retour terrain du livreur, fait progresser le statut
-- du colis (récupéré / en livraison / livré / échec / retour) à sa place.
-- packages_update_agent existe déjà (migration 0009) ; il manque les policies
-- pour les tables annexes touchées par ces actions.

create policy delivery_proofs_insert_agent on delivery_proofs
for insert with check (my_role() = 'AGENT');

create policy package_events_update_agent on package_events
for update using (my_role() = 'AGENT') with check (my_role() = 'AGENT');
