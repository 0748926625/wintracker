-- WINTRACKER — bucket de stockage pour les photos de preuve de livraison

insert into storage.buckets (id, name, public)
values ('delivery-proofs', 'delivery-proofs', true)
on conflict (id) do nothing;

-- Le premier segment du chemin est l'id du colis (ex: <package_id>/169999.jpg).
create or replace function package_id_from_storage_path(object_name text)
returns uuid
language sql
immutable
as $$
  select (split_part(object_name, '/', 1))::uuid;
$$;

create policy delivery_proofs_upload_driver on storage.objects
for insert with check (
  bucket_id = 'delivery-proofs'
  and exists (
    select 1 from packages p
    where p.id = package_id_from_storage_path(name)
    and my_role() = 'DRIVER'
    and p.driver_id = my_driver_id()
  )
);

create policy delivery_proofs_read on storage.objects
for select using (
  bucket_id = 'delivery-proofs'
  and (
    is_super_admin()
    or exists (
      select 1 from packages p
      where p.id = package_id_from_storage_path(name)
      and (
        (my_role() = 'COMPANY_USER' and p.company_id = my_company_id())
        or (my_role() = 'DRIVER' and p.driver_id = my_driver_id())
      )
    )
  )
);
