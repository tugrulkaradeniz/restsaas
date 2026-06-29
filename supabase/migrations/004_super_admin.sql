-- Super admin için tenant_id nullable yapılır
alter table users alter column tenant_id drop not null;
