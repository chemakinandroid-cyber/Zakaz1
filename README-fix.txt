Что уже исправлено в этом архиве:
- app/api/orders/route.js: серверное создание заказа
- app/order/page.js: исправлен build Vercel (Suspense для useSearchParams)
- app/page.js: stop_list теперь читается через menu_item_id
- lib/serverSupabase.js: серверный клиент Supabase

Что сделать:
1. Заменить файлами содержимое проекта.
2. Проверить .env.local:
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
3. Commit -> push -> redeploy.
