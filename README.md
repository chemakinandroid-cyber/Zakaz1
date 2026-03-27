# На Виражах — Online Order v2

## Структура

```
app/
  page.js              # Меню + корзина (клиент)
  order/page.js        # Отслеживание заказа
  admin/page.js        # Панель администратора
  api/
    orders/route.js         # POST — создание заказа
    admin/orders/route.js   # GET/PATCH — управление заказами
lib/
  supabase.js          # Клиентский Supabase
  serverSupabase.js    # Серверный Supabase (service role)
migration.sql          # Запустить в Supabase SQL Editor
```

## Деплой

### 1. Supabase — запустить миграцию

Открыть **Supabase → SQL Editor**, вставить и выполнить `migration.sql`.

Проверить результат:
```sql
SELECT * FROM cron.job WHERE jobname = 'expire-unconfirmed-orders';
SELECT * FROM order_counters;
```

### 2. GitHub

Закоммитить код. Убедиться что `.env.local` в `.gitignore`.

### 3. Vercel

1. Импортировать репозиторий
2. В настройках проекта → **Environment Variables** добавить:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy

## Логика заказов

- **Лимит**: не более 10 активных заказов на точку одновременно
- **Авто-истечение**: заказы в статусе `new` старше 15 минут → `expired` (pg_cron, каждые 5 минут)
- **Номера**: атомарный счётчик через PostgreSQL функцию `next_order_number(branch_id)`
- **Формат номера**: 4 цифры с ведущими нулями (0001, 0042, 1337)

## Статусы заказов

| Статус | Описание |
|--------|----------|
| `new` | Оформлен, ожидает звонка |
| `confirmed` | Подтверждён оператором |
| `preparing` | Готовится |
| `ready` | Готов к выдаче |
| `completed` | Выдан клиенту |
| `cancelled` | Отменён |
| `expired` | Истёк (15 мин без подтверждения) |

## Точки

| ID | Название | Телефон |
|----|----------|---------|
| `nv-fr-002` | Аэропорт | +7 902 452-42-22 |
| `nv-sh-001` | Конечная | +7 908 593-26-88 |
