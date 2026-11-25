import { type StockInput, type StockFileResult, skippedStockMatcher } from './free-stock-excel';

type ExistingStock = Omit<StockInput, 'storageBin' | 'stockQty' | 'availableQty'> & {
  id: number; storageBin: string | null; stockQty: { toString(): string }; availableQty: { toString(): string } | null; status: string;
};
const normalized = (value: string | null) => (value ?? '').trim().toUpperCase();
function identity(row: StockInput | ExistingStock) {
  return JSON.stringify([row.storageBin, row.materialCode, row.batch, row.certificateNo].map(normalized));
}
function signature(row: StockInput | ExistingStock) {
  return JSON.stringify([
    row.storageType, row.plant, row.storageLocation, row.availableQty?.toString() ?? null,
    row.stockQty.toString(), row.grDate?.toISOString() ?? null, row.grNumber, row.delivery,
    row.lastMovementDate?.toISOString() ?? null, row.lastChanger,
  ]);
}

/** Match occurrences, never collapse them. Exact snapshots win, then reserved rows and stable IDs.
 * Identical source rows have no persistent external identity; stable occurrence matching preserves
 * the existing reserved rows when a file contains fewer copies. No business uniqueness is imposed.
 */
export function planStockSnapshot(parsed: StockFileResult, existing: ExistingStock[]) {
  const groups = new Map<string, { incoming: number[]; saved: ExistingStock[] }>();
  const group = (key: string) => {
    let value = groups.get(key);
    if (!value) { value = { incoming: [], saved: [] }; groups.set(key, value); }
    return value;
  };
  parsed.rows.forEach((row, index) => group(identity(row)).incoming.push(index));
  existing.forEach((row) => group(identity(row)).saved.push(row));
  const matched = new Map<number, number>();
  const used = new Set<number>();
  for (const { incoming, saved } of groups.values()) {
    saved.sort((a, b) => Number(b.status === 'RESERVED') - Number(a.status === 'RESERVED') || a.id - b.id);
    const exact = new Map<string, { rows: ExistingStock[]; next: number }>();
    for (const row of saved) {
      const key = signature(row); let bucket = exact.get(key);
      if (!bucket) { bucket = { rows: [], next: 0 }; exact.set(key, bucket); }
      bucket.rows.push(row);
    }
    for (const index of incoming) {
      const bucket = exact.get(signature(parsed.rows[index]));
      const row = bucket?.rows[bucket.next];
      if (row && bucket) { bucket.next++; matched.set(index, row.id); used.add(row.id); }
    }
    let next = 0;
    for (const index of incoming) {
      if (matched.has(index)) continue;
      while (next < saved.length && used.has(saved[next].id)) next++;
      if (next < saved.length) { const row = saved[next++]; matched.set(index, row.id); used.add(row.id); }
    }
  }
  const invalidMatch = skippedStockMatcher(parsed.skippedIdentities);
  const protectedIds = existing.filter((row) => !used.has(row.id) && invalidMatch(row)).map((row) => row.id);
  return {
    rows: parsed.rows.map((row, index) => ({ row, id: matched.get(index) ?? null })),
    insertedRows: parsed.rows.length - matched.size,
    updatedRows: matched.size,
    protectedIds,
  };
}
