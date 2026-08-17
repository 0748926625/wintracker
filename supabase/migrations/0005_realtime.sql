-- WINTRACKER — active Supabase Realtime (postgres_changes) sur les tables suivies.
-- Sans ceci, aucun événement n'est diffusé même avec RLS correctement configuré.

alter publication supabase_realtime add table packages;
alter publication supabase_realtime add table package_events;
