-- WINTRACKER — schéma initial
-- Tables : companies, profiles, drivers, packages, package_events, delivery_proofs

create extension if not exists pgcrypto;

create type user_role as enum ('SUPER_ADMIN', 'COMPANY_USER', 'DRIVER');
create type driver_status as enum ('ACTIVE', 'INACTIVE');
create type package_status as enum ('EN_ATTENTE', 'RECUPERE', 'EN_LIVRAISON', 'LIVRE', 'ECHEC', 'RETOUR');

-- companies -----------------------------------------------------------

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

-- profiles ------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  role user_role not null,
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  constraint company_user_has_company check (
    (role = 'COMPANY_USER' and company_id is not null) or (role <> 'COMPANY_USER')
  )
);

create index profiles_user_id_idx on profiles(user_id);
create index profiles_company_id_idx on profiles(company_id);

-- drivers ---------------------------------------------------------------

create table drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  status driver_status not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

-- packages --------------------------------------------------------------

create table packages (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  company_id uuid not null references companies(id) on delete restrict,
  driver_id uuid references drivers(id) on delete set null,

  sender_name text not null,
  sender_phone text not null,

  recipient_name text not null,
  recipient_phone text not null,

  delivery_address text not null,

  description text,

  status package_status not null default 'EN_ATTENTE',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index packages_company_id_idx on packages(company_id);
create index packages_driver_id_idx on packages(driver_id);
create index packages_status_idx on packages(status);

-- package_events ----------------------------------------------------------

create table package_events (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages(id) on delete cascade,
  old_status package_status,
  new_status package_status not null,
  changed_by uuid references auth.users(id),
  comment text,
  created_at timestamptz not null default now()
);

create index package_events_package_id_idx on package_events(package_id);

-- delivery_proofs -----------------------------------------------------------

create table delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references packages(id) on delete cascade,
  receiver_name text not null,
  photo_url text,
  comment text,
  created_at timestamptz not null default now()
);

create index delivery_proofs_package_id_idx on delivery_proofs(package_id);
