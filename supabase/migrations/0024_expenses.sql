-- WINTRACKER — dépenses internes (charges mensuelles récurrentes, dépenses
-- journalières/ponctuelles). Réservé au SUPER_ADMIN. Utilisé par la page
-- "Dépenses" et pour calculer le Bénéfice (réel) sur la page Finances
-- (Marge - dépenses de la période).
--
-- Une charge récurrente (is_recurring = true) est saisie une seule fois :
-- expense_date fixe le jour du mois de l'échéance, à partir de ce mois-là.
-- recurrence_end (optionnel) arrête la récurrence à partir de cette date
-- (ex: départ d'un livreur). Le calcul des occurrences se fait côté client
-- (src/lib/expenses.ts), pas ici.

create type expense_category as enum (
  'SALAIRE_AGENT',
  'SALAIRE_LIVREUR',
  'CARBURANT',
  'REPARATION',
  'AUTRE'
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  category expense_category not null,
  label text not null,
  amount integer not null check (amount > 0),
  is_recurring boolean not null default false,
  expense_date date not null,
  recurrence_end date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint expenses_recurrence_end_after_start check (
    recurrence_end is null or recurrence_end >= expense_date
  )
);

create index expenses_expense_date_idx on expenses(expense_date);

alter table expenses enable row level security;

create policy expenses_all_super_admin on expenses
for all using (is_super_admin()) with check (is_super_admin());
