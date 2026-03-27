-- ═══════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: На Виражах v2
-- Запустить в Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Атомарный счётчик номеров заказов ───────────────────────
-- Функция безопасно инкрементирует счётчик и возвращает следующий номер.
-- Использует FOR UPDATE чтобы избежать race condition при параллельных заказах.

CREATE OR REPLACE FUNCTION next_order_number(p_branch_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO order_counters (branch_id, last_number)
  VALUES (p_branch_id, 1)
  ON CONFLICT (branch_id) DO UPDATE
    SET last_number = order_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

-- ─── 2. Инициализация счётчиков для точек ───────────────────────
-- Выполнить один раз. Если записи уже есть — ничего не изменится.

INSERT INTO order_counters (branch_id, last_number)
VALUES
  ('nv-fr-002', 0),
  ('nv-sh-001', 0)
ON CONFLICT (branch_id) DO NOTHING;

-- ─── 3. Статус expired для просроченных заказов ──────────────────
-- Добавляем статус cancelled и expired если нужно (идемпотентно):
-- (Supabase использует text для status, ограничения задаются через check constraint)

-- Если у вас есть check constraint на status — добавьте expired и cancelled:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'expired'));

-- ─── 4. Авто-отмена заказов через 15 минут (pg_cron) ────────────
-- Требует расширение pg_cron (включено в Supabase по умолчанию).
-- Заказы в статусе 'new' старше 15 минут → переводим в 'expired'.

-- Включаем расширение (если ещё не включено):
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Удаляем старую задачу если была:
SELECT cron.unschedule('expire-unconfirmed-orders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-unconfirmed-orders');

-- Создаём задачу: каждые 5 минут проверяем просроченные заказы
SELECT cron.schedule(
  'expire-unconfirmed-orders',
  '*/5 * * * *',
  $$
    UPDATE orders
    SET status = 'expired'
    WHERE status = 'new'
      AND created_at < NOW() - INTERVAL '15 minutes';
  $$
);

-- ─── 5. RLS политики ────────────────────────────────────────────
-- Клиент может создавать заказы и читать свой заказ по ID/номеру.
-- Изменение статусов — только через service role (API route).

-- orders: читать по номеру разрешено всем (для страницы отслеживания)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_public" ON orders;
CREATE POLICY "orders_select_public" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "orders_insert_public" ON orders;
CREATE POLICY "orders_insert_public" ON orders
  FOR INSERT WITH CHECK (true);

-- UPDATE только через service role key (которая bypasses RLS)

-- order_items: читать разрешено всем
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
CREATE POLICY "order_items_select_public" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items_insert_public" ON order_items;
CREATE POLICY "order_items_insert_public" ON order_items
  FOR INSERT WITH CHECK (true);

-- menu_items и branches: только чтение для всех
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_items_select_public" ON menu_items;
CREATE POLICY "menu_items_select_public" ON menu_items
  FOR SELECT USING (true);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_select_public" ON branches;
CREATE POLICY "branches_select_public" ON branches
  FOR SELECT USING (true);

ALTER TABLE stop_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stop_list_select_public" ON stop_list;
CREATE POLICY "stop_list_select_public" ON stop_list
  FOR SELECT USING (true);

ALTER TABLE order_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_counters_select_public" ON order_counters;
CREATE POLICY "order_counters_select_public" ON order_counters
  FOR SELECT USING (true);

-- ─── ГОТОВО ─────────────────────────────────────────────────────
-- После запуска миграции проверьте:
-- SELECT * FROM cron.job WHERE jobname = 'expire-unconfirmed-orders';
-- SELECT * FROM order_counters;

-- ─── Политики для стоп-листа (управление из админки) ────────────────────────
-- Авторизованные пользователи могут изменять стоп-лист

DROP POLICY IF EXISTS "stop_list_insert_auth" ON stop_list;
CREATE POLICY "stop_list_insert_auth" ON stop_list
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stop_list_update_auth" ON stop_list;
CREATE POLICY "stop_list_update_auth" ON stop_list
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stop_list_delete_auth" ON stop_list;
CREATE POLICY "stop_list_delete_auth" ON stop_list
  FOR DELETE USING (auth.role() = 'authenticated');
