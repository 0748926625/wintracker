-- WINTRACKER — permet aux charges récurrentes d'être hebdomadaires en plus
-- de mensuelles (ex: budget carburant hebdomadaire). Le calcul des
-- occurrences reste côté client (src/lib/expenses.ts) : chaque semaine (ou
-- mois) où l'ancre tombe dans la période choisie compte une occurrence.

create type expense_recurrence as enum ('MONTHLY', 'WEEKLY');

alter table expenses add column recurrence_frequency expense_recurrence;

-- Les charges récurrentes déjà existantes étaient toutes mensuelles.
update expenses set recurrence_frequency = 'MONTHLY' where is_recurring;

alter table expenses add constraint expenses_recurrence_frequency_required check (
  (is_recurring and recurrence_frequency is not null) or
  (not is_recurring and recurrence_frequency is null)
);
