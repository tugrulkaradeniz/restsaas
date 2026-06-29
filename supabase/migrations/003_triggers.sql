-- ============================================================
-- Trigger'lar
-- ============================================================

-- 1. Sipariş onaylandığında stok düş + puan kazan
create or replace function handle_order_confirmed()
returns trigger language plpgsql security definer as $$
declare
  item record;
  ing record;
  tenant record;
  customer record;
  earned_points integer;
begin
  if new.status = 'confirmed' and old.status = 'pending' then

    -- Stok düş: her sipariş kalemi → reçete → malzeme
    for item in
      select oi.menu_item_id, oi.quantity
      from order_items oi
      where oi.order_id = new.id and oi.status != 'cancelled'
    loop
      for ing in
        select r.ingredient_id,
               r.quantity * item.quantity * (1 + r.waste_percent / 100) as consume
        from recipes r
        where r.menu_item_id = item.menu_item_id
      loop
        update ingredients
        set stock_qty = stock_qty - ing.consume
        where id = ing.ingredient_id;
      end loop;
    end loop;

    -- Sadakat puan kazan
    select * into tenant from tenants where id = new.tenant_id;
    if tenant.loyalty_enabled and new.customer_phone is not null then
      select * into customer
      from customers
      where tenant_id = new.tenant_id and phone = new.customer_phone;

      if found then
        earned_points := floor((new.total_amount - new.discount_amount) / tenant.loyalty_rate)::integer;
        if earned_points > 0 then
          update customers set points_balance = points_balance + earned_points
          where id = customer.id;
          insert into loyalty_transactions (customer_id, order_id, type, points, note)
          values (customer.id, new.id, 'earn', earned_points, 'Sipariş puanı');
        end if;
      end if;
    end if;

  end if;
  return new;
end;
$$;

create trigger trg_order_confirmed
  after update on orders
  for each row execute function handle_order_confirmed();

-- 2. Sipariş iptal edildiğinde stok iade
create or replace function handle_order_cancelled()
returns trigger language plpgsql security definer as $$
declare
  item record;
  ing record;
  customer record;
begin
  if new.status = 'cancelled' and old.status in ('confirmed','preparing','ready') then

    -- Stok iade
    for item in
      select oi.menu_item_id, oi.quantity
      from order_items oi
      where oi.order_id = new.id and oi.status != 'cancelled'
    loop
      for ing in
        select r.ingredient_id,
               r.quantity * item.quantity * (1 + r.waste_percent / 100) as consume
        from recipes r
        where r.menu_item_id = item.menu_item_id
      loop
        update ingredients
        set stock_qty = stock_qty + ing.consume
        where id = ing.ingredient_id;
      end loop;
    end loop;

    -- Puan iade
    if new.points_used > 0 and new.customer_phone is not null then
      select * into customer
      from customers
      where tenant_id = new.tenant_id and phone = new.customer_phone;
      if found then
        update customers set points_balance = points_balance + new.points_used
        where id = customer.id;
        insert into loyalty_transactions (customer_id, order_id, type, points, note)
        values (customer.id, new.id, 'earn', new.points_used, 'İptal iadesi');
      end if;
    end if;

    -- Masa durumunu güncelle
    if new.table_id is not null then
      update tables set status = 'empty' where id = new.table_id;
    end if;

  end if;
  return new;
end;
$$;

create trigger trg_order_cancelled
  after update on orders
  for each row execute function handle_order_cancelled();

-- 3. Sipariş ödendi → masa boşalt
create or replace function handle_order_paid()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'paid' and old.status != 'paid' then
    if new.table_id is not null then
      update tables set status = 'empty' where id = new.table_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_order_paid
  after update on orders
  for each row execute function handle_order_paid();

-- 4. Sipariş aktif → masa dolu
create or replace function handle_order_active()
returns trigger language plpgsql security definer as $$
begin
  if new.table_id is not null and
     new.status in ('confirmed','preparing','ready','delivered') and
     old.status = 'pending' then
    update tables set status = 'occupied' where id = new.table_id;
  end if;
  return new;
end;
$$;

create trigger trg_order_active
  after update on orders
  for each row execute function handle_order_active();

-- 5. Yeni kullanıcı kaydında public.users'a satır ekle
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, tenant_id, email, role, full_name)
  values (
    new.id,
    (new.raw_app_meta_data ->> 'tenant_id')::uuid,
    new.email,
    coalesce(new.raw_app_meta_data ->> 'role', 'waiter'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_new_user
  after insert on auth.users
  for each row execute function handle_new_user();
