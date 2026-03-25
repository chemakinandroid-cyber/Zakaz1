export function firstValue(row, keys, fallback = null) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) return row[key];
  }
  return fallback;
}

export function textIncludes(key, list) {
  const lower = String(key).toLowerCase();
  return list.some((part) => lower.includes(part));
}

export function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function makeOrderId() {
  return `NV-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function humanBranchName(branchId) {
  if (branchId === 'airport') return 'На Виражах — Аэропорт';
  if (branchId === 'konechnaya') return 'На Виражах — Конечная';
  return branchId;
}
