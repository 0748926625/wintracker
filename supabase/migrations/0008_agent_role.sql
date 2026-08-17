-- WINTRACKER — nouveau rôle AGENT (personnel Winner Express en gare).
-- Isolé dans sa propre migration : Postgres interdit d'utiliser une nouvelle
-- valeur d'enum dans la même transaction que celle qui l'a ajoutée.

alter type user_role add value 'AGENT';
