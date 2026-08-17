-- WINTRACKER — nom et téléphone de l'expéditeur deviennent facultatifs.

alter table packages alter column sender_name drop not null;
alter table packages alter column sender_phone drop not null;
