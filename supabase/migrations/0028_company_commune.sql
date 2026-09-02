-- WINTRACKER — attribut "commune" (localisation) de chaque compagnie. Permet
-- de filtrer colis/dashboard par commune, indépendamment du groupe : plusieurs
-- compagnies peuvent partager la même commune sans appartenir au même groupe.

alter table companies add column commune text;
