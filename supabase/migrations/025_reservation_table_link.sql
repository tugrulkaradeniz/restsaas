-- ============================================================
-- Rezervasyon <-> Masa otomatik bağlantısı
-- ============================================================

-- 1. Rezervasyon oluşturulunca/güncellenince masa durumunu senkronize et
create or replace function sync_table_status_from_reservation()
returns trigger language plpgsql security definer as $$
begin
  -- Bugüne ait aktif (bekleyen/onaylı) rezervasyon → masayı rezerve göster
  -- (sadece masa boşsa; dolu/kirli masanın üzerine yazma)
  if new.table_id is not null and new.status in ('pending', 'confirmed') and new.date = current_date then
    update tables set status = 'reserved'
    where id = new.table_id and status = 'empty';
  end if;

  -- Rezervasyon iptal/tamamlandı → başka aktif rezervasyonu yoksa masayı boşalt
  if TG_OP = 'UPDATE'
     and new.status in ('cancelled', 'completed')
     and old.status in ('pending', 'confirmed')
     and old.table_id is not null then
    if not exists (
      select 1 from reservations
      where table_id = old.table_id
        and date = current_date
        and status in ('pending', 'confirmed')
        and id != old.id
    ) then
      update tables set status = 'empty' where id = old.table_id and status = 'reserved';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservation_table_status on reservations;
create trigger trg_reservation_table_status
  after insert or update on reservations
  for each row execute function sync_table_status_from_reservation();

-- 2. Rezerve masaya sipariş açılınca (misafir geldi) o günkü rezervasyonu tamamlanmış say
create or replace function complete_reservation_on_order()
returns trigger language plpgsql security definer as $$
begin
  if new.table_id is not null then
    update reservations
    set status = 'completed'
    where table_id = new.table_id
      and date = current_date
      and status in ('pending', 'confirmed');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_completes_reservation on orders;
create trigger trg_order_completes_reservation
  after insert on orders
  for each row execute function complete_reservation_on_order();
