import { supabase } from './supabase';
import { firstValue, textIncludes, normalizeNumber, makeOrderId, humanBranchName } from './utils';

const sampleCache = {};

async function getSample(table) {
  if (sampleCache[table]) return sampleCache[table];
  const { data } = await supabase.from(table).select('*').limit(1);
  const sample = data?.[0] || null;
  sampleCache[table] = sample;
  return sample;
}

function keysFromSample(sample, defaults = []) {
  if (!sample) return defaults;
  return Object.keys(sample);
}

function mapBranch(row) {
  return {
    id: String(firstValue(row, ['id', 'branch_id', 'code', 'slug'], '')),
    name: String(firstValue(row, ['name', 'title', 'branch_name', 'label'], firstValue(row, ['id', 'branch_id'], 'Филиал'))),
  };
}

function mapMenuItem(row) {
  const branchId = firstValue(row, ['branch_id', 'branch', 'branch_code'], null);
  const branches = Array.isArray(branchId) ? branchId : branchId ? [String(branchId)] : [];

  return {
    id: String(firstValue(row, ['id', 'item_id', 'menu_item_id', 'code'], '')),
    name: String(firstValue(row, ['name', 'title', 'label'], 'Без названия')),
    description: String(firstValue(row, ['description', 'desc', 'ingredients', 'composition'], '')),
    price: normalizeNumber(firstValue(row, ['price', 'sale_price', 'amount', 'cost'], 0), 0),
    category: String(firstValue(row, ['category', 'category_name', 'group_name', 'type'], 'Прочее')),
    imageUrl: firstValue(row, ['image_url', 'image', 'photo_url', 'photo'], ''),
    active: Boolean(firstValue(row, ['is_active', 'active', 'enabled', 'available'], true)),
    sortOrder: normalizeNumber(firstValue(row, ['sort_order', 'position', 'order_num'], 0), 0),
    branchIds: branches,
  };
}

function mapOrder(row) {
  return {
    id: String(firstValue(row, ['id', 'order_id'], '')),
    branchId: String(firstValue(row, ['branch_id', 'branch'], '')),
    branchName: String(firstValue(row, ['branch_name', 'branch_title'], '')),
    status: String(firstValue(row, ['status'], 'new')),
    paymentMethod: String(firstValue(row, ['payment_method'], 'pay_on_pickup')),
    paymentStatus: String(firstValue(row, ['payment_status'], 'unpaid')),
    total: normalizeNumber(firstValue(row, ['total', 'amount', 'sum'], 0), 0),
    createdAt: firstValue(row, ['created_at', 'createdAt', 'datetime'], ''),
    customerName: String(firstValue(row, ['customer_name', 'name', 'client_name'], '')),
    phone: String(firstValue(row, ['customer_phone', 'phone', 'client_phone'], '')),
    comment: String(firstValue(row, ['comment', 'notes', 'note'], '')),
  };
}

function mapStopRows(rows) {
  const result = {};

  for (const row of rows || []) {
    const branchId = String(firstValue(row, ['branch_id', 'branch'], ''));
    const itemId = String(firstValue(row, ['menu_item_id', 'item_id', 'product_id', 'id'], ''));
    const active = firstValue(row, ['is_active', 'active', 'enabled'], true);
    if (!branchId || !itemId || active === false) continue;
    if (!result[branchId]) result[branchId] = [];
    result[branchId].push(itemId);
  }

  return result;
}

export async function loadBranches() {
  const { data, error } = await supabase.from('branches').select('*');
  if (error) return [];
  return (data || []).map(mapBranch);
}

export async function loadMenuItems() {
  const { data, error } = await supabase.from('menu_items').select('*');
  if (error) return [];
  return (data || []).map(mapMenuItem);
}

export async function loadOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false, nullsFirst: false });
  if (error) {
    const fallback = await supabase.from('orders').select('*');
    return (fallback.data || []).map(mapOrder);
  }
  return (data || []).map(mapOrder);
}

export async function loadStopList() {
  const { data, error } = await supabase.from('stop_list').select('*');
  if (error) return {};
  return mapStopRows(data || []);
}

function fillPayload(columns, semanticMap) {
  const payload = {};
  for (const column of columns) {
    const lower = column.toLowerCase();
    for (const entry of semanticMap) {
      if (entry.match(lower, column)) {
        const value = entry.value(column);
        if (value !== undefined) payload[column] = value;
        break;
      }
    }
  }
  return payload;
}

function orderSemanticValues({ orderId, branch, checkout, total }) {
  const branchName = branch.name || humanBranchName(branch.id);
  return [
    { match: (l) => l === 'id' || l === 'order_id', value: () => orderId },
    { match: (l) => l === 'branch_id' || l === 'branch', value: () => branch.id },
    { match: (l) => l === 'branch_name' || l === 'branch_title', value: () => branchName },
    { match: (l) => l === 'status', value: () => 'new' },
    { match: (l) => l === 'payment_method', value: () => checkout.paymentMethod || 'pay_on_pickup' },
    { match: (l) => l === 'payment_status', value: () => checkout.paymentMethod === 'sbp' ? 'pending' : 'unpaid' },
    { match: (l) => l === 'total' || l === 'amount' || l === 'sum', value: () => total },
    { match: (l) => l === 'customer_name' || l === 'name' || l === 'client_name', value: () => checkout.customerName || '' },
    { match: (l) => l === 'customer_phone' || l === 'phone' || l === 'client_phone', value: () => checkout.customerPhone || '' },
    { match: (l) => l === 'comment' || l === 'notes' || l === 'note', value: () => checkout.comment || '' },
    { match: (l) => l === 'order_type' || l === 'delivery_type', value: () => 'pickup' },
    { match: (l) => l === 'source', value: () => 'web' },
    { match: (l) => l === 'created_at' || l === 'createdat' || l === 'datetime', value: () => new Date().toISOString() },
  ];
}

function orderItemSemanticValues({ orderId, branchId, branchName, item }) {
  return [
    { match: (l) => l === 'id', value: () => `${orderId}_${item.itemId}_${Math.random().toString(36).slice(2, 6)}` },
    { match: (l) => l === 'order_id', value: () => orderId },
    { match: (l) => l === 'branch_id' || l === 'branch', value: () => branchId },
    { match: (l) => l === 'branch_name', value: () => branchName },
    { match: (l) => l === 'menu_item_id' || l === 'item_id' || l === 'product_id', value: () => item.itemId },
    { match: (l) => l === 'name' || l === 'title' || l === 'item_name', value: () => item.name },
    { match: (l) => l === 'quantity' || l === 'qty', value: () => item.qty },
    { match: (l) => l === 'price' || l === 'unit_price', value: () => item.price },
    { match: (l) => l === 'total' || l === 'line_total' || l === 'amount' || l === 'sum', value: () => Number(item.price) * Number(item.qty) },
    { match: (l) => l === 'created_at', value: () => new Date().toISOString() },
  ];
}

export async function createOrderWithItems({ branch, checkout, items }) {
  try {
    const orderSample = await getSample('orders');
    const orderItemSample = await getSample('order_items');
    const orderColumns = keysFromSample(orderSample, ['id', 'branch_id', 'branch_name', 'status', 'payment_method', 'payment_status', 'total']);
    const orderItemColumns = keysFromSample(orderItemSample, ['order_id', 'menu_item_id', 'name', 'quantity', 'price', 'total']);

    let created = null;
    let lastError = null;

    for (let i = 0; i < 4; i += 1) {
      const orderId = makeOrderId();
      const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
      const orderPayload = fillPayload(orderColumns, orderSemanticValues({ orderId, branch, checkout, total }));
      const orderInsert = await supabase.from('orders').insert(orderPayload).select('*').single();
      if (orderInsert.error) {
        lastError = orderInsert.error;
        continue;
      }
      created = mapOrder(orderInsert.data);

      const branchName = created.branchName || branch.name || humanBranchName(branch.id);
      const itemPayloads = items.map((item) => fillPayload(orderItemColumns, orderItemSemanticValues({ orderId: created.id, branchId: branch.id, branchName, item })));
      const itemInsert = await supabase.from('order_items').insert(itemPayloads);
      if (itemInsert.error) {
        return { ok: false, error: `order_items: ${itemInsert.error.message}` };
      }
      return { ok: true, orderId: created.id };
    }

    return { ok: false, error: lastError?.message || 'Не удалось вставить заказ' };
  } catch (error) {
    return { ok: false, error: error.message || 'Неизвестная ошибка' };
  }
}

export async function setOrderStatus(orderId, status) {
  const sample = await getSample('orders');
  const keys = keysFromSample(sample, ['id', 'status']);
  const idColumn = keys.find((key) => key.toLowerCase() === 'id' || key.toLowerCase() === 'order_id') || 'id';
  const statusColumn = keys.find((key) => key.toLowerCase() === 'status') || 'status';
  const update = { [statusColumn]: status };
  return supabase.from('orders').update(update).eq(idColumn, orderId);
}

export async function toggleStopListItem(branchId, item) {
  const sample = await getSample('stop_list');
  const columns = keysFromSample(sample, ['branch_id', 'menu_item_id']);
  const stopRows = await loadStopList();
  const stopped = (stopRows[branchId] || []).includes(item.id);
  const branchName = humanBranchName(branchId);
  const idColumn = columns.find((c) => c.toLowerCase() === 'id');
  const branchColumn = columns.find((c) => c.toLowerCase() === 'branch_id' || c.toLowerCase() === 'branch') || 'branch_id';
  const itemColumn = columns.find((c) => ['menu_item_id', 'item_id', 'product_id'].includes(c.toLowerCase())) || 'menu_item_id';

  if (stopped) {
    let query = supabase.from('stop_list').delete().eq(branchColumn, branchId).eq(itemColumn, item.id);
    return query;
  }

  const payload = fillPayload(columns, [
    { match: (l) => l === 'id', value: () => `${branchId}_${item.id}` },
    { match: (l) => l === 'branch_id' || l === 'branch', value: () => branchId },
    { match: (l) => l === 'branch_name', value: () => branchName },
    { match: (l) => l === 'menu_item_id' || l === 'item_id' || l === 'product_id', value: () => item.id },
    { match: (l) => l === 'item_name' || l === 'name' || l === 'title', value: () => item.name },
    { match: (l) => l === 'is_active' || l === 'active' || l === 'enabled', value: () => true },
    { match: (l) => l === 'created_at', value: () => new Date().toISOString() },
  ]);

  return supabase.from('stop_list').insert(payload);
}

export function subscribeToOrders(callback) {
  return supabase
    .channel('orders-watch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
}

export function subscribeToStopList(callback) {
  return supabase
    .channel('stop-list-watch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stop_list' }, callback)
    .subscribe();
}
