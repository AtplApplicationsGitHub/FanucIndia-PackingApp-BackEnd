import { Prisma } from '@prisma/client';
import type { ReservationInput } from './free-stock-excel';

export type AllocationStock = {
  id: number; materialCode: string; storageBin: string | null; batch: string; certificateNo: string | null;
  stockQty: Prisma.Decimal; status: string; grDate: Date | null; updatedAt: Date;
  reservations: { id: number }[];
};

/** Whole-row locks apply immediately in the simulation, including unused balances. */
export function allocateClosestStock(lines: ReservationInput[], items: AllocationStock[]) {
  const eligible = new Map<string, AllocationStock[]>();
  for (const item of items) {
    if (item.status !== 'OPEN' || item.reservations.length || !item.stockQty.greaterThan(0)) continue;
    const key = item.materialCode.trim().toUpperCase();
    const bucket = eligible.get(key) ?? [];
    if (!eligible.has(key)) eligible.set(key, bucket);
    bucket.push(item);
  }
  // Binary search distinct quantities; deletion-only disjoint sets skip exhausted groups.
  // This avoids repeatedly walking thousands of already locked rows for large requests.
  const pools = new Map([...eligible].map(([code, rows]) => {
    rows.sort((a, b) => a.stockQty.comparedTo(b.stockQty)
      || (a.grDate?.getTime() ?? Infinity) - (b.grDate?.getTime() ?? Infinity) || a.id - b.id);
    const groups: { qty: Prisma.Decimal; rows: AllocationStock[]; next: number }[] = [];
    for (const row of rows) {
      const last = groups[groups.length - 1];
      if (last?.qty.equals(row.stockQty)) last.rows.push(row);
      else groups.push({ qty: row.stockQty, rows: [row], next: 0 });
    }
    const forward = Array.from({ length: groups.length + 1 }, (_, index) => index);
    const reverse = [...forward];
    const find = (parents: number[], start: number): number => {
      let root = start;
      while (parents[root] !== root) root = parents[root];
      while (parents[start] !== start) { const next = parents[start]; parents[start] = root; start = next; }
      return root;
    };
    const take = (remaining: Prisma.Decimal): AllocationStock | undefined => {
      let low = 0, high = groups.length;
      while (low < high) { const mid = (low + high) >>> 1; if (groups[mid].qty.lessThan(remaining)) low = mid + 1; else high = mid; }
      const above = find(forward, low);
      const below = groups.length - 1 - find(reverse, groups.length - low);
      let chosen = above < groups.length ? above : below;
      if (below >= 0 && above < groups.length
        && remaining.minus(groups[below].qty).lessThan(groups[above].qty.minus(remaining))) chosen = below;
      // Equal distance prefers the group able to cover the remaining quantity.
      if (chosen < 0 || chosen >= groups.length) return undefined;
      const group = groups[chosen], item = group.rows[group.next++];
      if (group.next === group.rows.length) {
        forward[chosen] = find(forward, chosen + 1);
        const reverseIndex = groups.length - 1 - chosen;
        reverse[reverseIndex] = find(reverse, reverseIndex + 1);
      }
      return item;
    };
    return [code, { take }] as const;
  }));
  let requestedQty = new Prisma.Decimal(0), allocatedQty = new Prisma.Decimal(0);
  const counts = { allocated: 0, partial: 0, notAllocated: 0 };
  const allocation = lines.map((line) => {
    let remaining = new Prisma.Decimal(line.qty);
    const allocations: {
      stockItemId: number; storageBin: string | null; batch: string; certificateNo: string | null;
      stockQty: string; allocatedQty: string; version: string;
    }[] = [];
    const pool = pools.get(line.materialCode);
    while (remaining.greaterThan(0)) {
      const best = pool?.take(remaining);
      if (!best) break;
      const amount = Prisma.Decimal.min(remaining, best.stockQty);
      allocations.push({ stockItemId: best.id, storageBin: best.storageBin, batch: best.batch, certificateNo: best.certificateNo,
        stockQty: best.stockQty.toFixed(), allocatedQty: amount.toFixed(), version: best.updatedAt.toISOString() });
      remaining = remaining.minus(amount);
    }
    const requested = new Prisma.Decimal(line.qty), allocated = requested.minus(remaining);
    requestedQty = requestedQty.plus(requested); allocatedQty = allocatedQty.plus(allocated);
    const status = allocated.equals(0) ? 'NOT_ALLOCATED' : remaining.greaterThan(0) ? 'PARTIAL' : 'ALLOCATED';
    if (status === 'ALLOCATED') counts.allocated++; else if (status === 'PARTIAL') counts.partial++; else counts.notAllocated++;
    return { ...line, requestedQty: requested.toFixed(), allocatedQty: allocated.toFixed(), pendingQty: remaining.toFixed(), status,
      remarks: status === 'ALLOCATED' ? 'Fully allocated.' : status === 'PARTIAL' ? 'Partially allocated; remaining quantity is unavailable.' : 'No unreserved stock is available.',
      allocations };
  });
  return { lines: allocation, summary: { ...counts, requestedQty: requestedQty.toFixed(), allocatedQty: allocatedQty.toFixed(), pendingQty: requestedQty.minus(allocatedQty).toFixed() },
    totalRows: lines.length, canConfirm: allocatedQty.greaterThan(0) };
}
