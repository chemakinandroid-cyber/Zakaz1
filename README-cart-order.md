Что заменено/добавлено:
- app/page.js
- app/order/page.js
- app/api/orders/route.js
- lib/serverSupabase.js

Что уже умеет:
- витрина с учетом stop_list
- корзина в localStorage
- оформление заказа через /api/orders
- запись в orders и order_items
- переход на страницу отслеживания заказа после оформления

Что нужно в .env.local:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

Важно:
- stop_list поддержан в двух вариантах: item_id или menu_item_id
- route.js пытается вставлять заказ и позиции в нескольких вариантах payload, чтобы с большей вероятностью совпасть с вашей схемой
- если таблица orders требует еще обязательные NOT NULL поля, их надо будет добавить в payload в app/api/orders/route.js
