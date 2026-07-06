-- 019'da demo restoranlara giriş kodu ve masa tanımlanmamış, /login akışı
-- 8 haneli restoran kodu zorunlu kıldığından demo hesaplarla giriş yapılamıyordu.
update tenants set code = 'LEZZETDU' where slug = 'lezzet-kebap' and code is null;
update tenants set code = 'PIZZAMON' where slug = 'pizza-mondo' and code is null;

insert into tables (tenant_id, name, capacity, status)
select id, name, capacity, 'empty'
from tenants
cross join (values
  ('Masa 1', 4), ('Masa 2', 4), ('Masa 3', 2),
  ('Masa 4', 6), ('Masa 5', 2)
) as t(name, capacity)
where tenants.slug in ('lezzet-kebap', 'pizza-mondo')
  and not exists (select 1 from tables where tables.tenant_id = tenants.id);
