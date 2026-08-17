-- WINTRACKER — référence interne de la compagnie (numéro de gare), en plus du
-- tracking_number WINTRACKER qui reste la référence officielle et unique.

alter table packages add column external_reference text;
