import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma.service';
import { DeleteLocationQueryDto, LocationMasterQueryDto } from './location-master.dto';
import { createLocationWorkbook, LocationUploadRow } from './location-master.excel';

const BATCH_SIZE = 500;

function rackKey(rackNumber: string): string | null {
  const parts = rackNumber.split('-');
  if (parts.length !== 3 || parts.some((part) => !part || part !== part.trim())) {
    return null;
  }
  return `${parts[0]}-${parts[2]}`;
}

function locationKey(plantCode: string, number: string): string {
  return JSON.stringify([plantCode, number]);
}

function batch<T>(items: T[], start: number): T[] {
  return items.slice(start, start + BATCH_SIZE);
}

function addToGroup<T>(groups: Map<string, T[]>, key: string, item: T): void {
  const existing = groups.get(key);
  if (existing) existing.push(item);
  else groups.set(key, [item]);
}

type ValidatedLocationRow = LocationUploadRow & { rackKey: string };

function validateRowFormat(rows: LocationUploadRow[]): ValidatedLocationRow[] {
  const validRows: ValidatedLocationRow[] = [];
  for (const row of rows) {
    if (row.errors.length) continue;
    const { plantCode, materialBarcode, rackNumber, errors } = row;
    const key = rackKey(rackNumber);

    if (!plantCode) errors.push('Plant Code is required.');
    if (!/^[A-Za-z0-9]{15}$/.test(materialBarcode)) {
      errors.push('Material Barcode must contain exactly 15 letters or digits.');
    }
    if (!key) errors.push('Rack Number must have three segments, for example 12-A-12.');

    if (!errors.length && key) validRows.push({ ...row, rackKey: key });
  }
  return validRows;
}

@Injectable()
export class LocationMasterService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LocationMasterQueryDto) {
    const { page, limit } = query;
    const search = query.search?.trim().replace(/[\\%_]/g, '\\$&');
    const where: Prisma.LocationWhereInput = search
      ? {
          OR: [
            { plantCode: { contains: search, mode: 'insensitive' } },
            { materialBarcode: { contains: search, mode: 'insensitive' } },
            { rackNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({
        where,
        orderBy: [{ plantCode: 'asc' }, { rackNumber: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.location.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async downloadWorkbook() {
    const entries = await this.prisma.location.findMany({
      orderBy: [{ plantCode: 'asc' }, { rackNumber: 'asc' }],
    });
    return createLocationWorkbook(entries);
  }

  async deleteLevel({ plantCode, rackNumber }: DeleteLocationQueryDto): Promise<void> {
    const deleted = await this.prisma.location.deleteMany({ where: { plantCode, rackNumber } });
    if (!deleted.count) throw new NotFoundException('Rack level was not found.');
  }

  async preview(rows: LocationUploadRow[]) {
    const { preview } = await this.prisma.$transaction(
      (tx) => this.validate(tx, rows),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return preview;
  }

  async import(rows: LocationUploadRow[]) {
    return this.prisma.$transaction(async (tx) => {
      // Wait for any other import before taking the validation snapshot.
      await tx.$executeRaw`LOCK TABLE "LocationRack", "Location" IN SHARE ROW EXCLUSIVE MODE`;

      const { preview, additions, newRacks } = await this.validate(tx, rows);
      if (!preview.canImport) {
        throw new BadRequestException({
          code: 'LOCATION_UPLOAD_INVALID',
          message: 'Correct the invalid rows before importing.',
          details: preview,
        });
      }

      for (let i = 0; i < newRacks.length; i += BATCH_SIZE) {
        await tx.locationRack.createMany({ data: batch(newRacks, i) });
      }

      for (let i = 0; i < additions.length; i += BATCH_SIZE) {
        await tx.location.createMany({ data: batch(additions, i) });
      }
      return { counts: preview.counts };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async validate(tx: Prisma.TransactionClient, inputRows: LocationUploadRow[]) {
    const rows = inputRows.map((row) => ({ ...row, errors: [...row.errors] }));
    const validRows = validateRowFormat(rows);
    const rowsByLevel = new Map<string, ValidatedLocationRow[]>();
    for (const row of validRows) {
      addToGroup(rowsByLevel, locationKey(row.plantCode, row.rackNumber), row);
    }

    const levelFilters = Array.from(rowsByLevel.values(), (matches) => {
      const { plantCode, rackNumber } = matches[0];
      if (matches.length > 1) {
        for (const row of matches) {
          row.errors.push(`Rack Number ${rackNumber} in plant ${plantCode} is used by multiple rows in this workbook.`);
        }
      }
      return { plantCode, rackNumber };
    });

    const levels = new Map<string, string>();
    for (let i = 0; i < levelFilters.length; i += BATCH_SIZE) {
      const savedLevels = await tx.location.findMany({
        where: { OR: batch(levelFilters, i) },
      });
      for (const level of savedLevels) {
        levels.set(locationKey(level.plantCode, level.rackNumber), level.materialBarcode);
      }
    }

    const newRows = validRows.filter((row) => {
      if (row.errors.length) return false;
      const savedBarcode = levels.get(locationKey(row.plantCode, row.rackNumber));
      if (savedBarcode && savedBarcode !== row.materialBarcode) {
        row.errors.push(`Rack Number ${row.rackNumber} already exists in plant ${row.plantCode} with Material Barcode ${savedBarcode}.`);
      }
      return !savedBarcode;
    });

    const requestedRacks = new Map<string, { plantCode: string; rackKey: string }>();
    const requestedBarcodes = new Set<string>();
    for (const row of newRows) {
      requestedRacks.set(locationKey(row.plantCode, row.rackKey), {
        plantCode: row.plantCode,
        rackKey: row.rackKey,
      });
      requestedBarcodes.add(row.materialBarcode);
    }

    const racks = Array.from(requestedRacks.values());
    const barcodes = Array.from(requestedBarcodes);
    const barcodeByRack = new Map<string, string>();
    const rackByBarcode = new Map<string, { plantCode: string; rackKey: string }>();
    for (let i = 0; i < Math.max(racks.length, barcodes.length); i += BATCH_SIZE) {
      const savedRacks = await tx.locationRack.findMany({
        where: {
          OR: [...batch(racks, i), { materialBarcode: { in: batch(barcodes, i) } }],
        },
      });
      for (const rack of savedRacks) {
        barcodeByRack.set(locationKey(rack.plantCode, rack.rackKey), rack.materialBarcode);
        rackByBarcode.set(rack.materialBarcode, rack);
      }
    }

    const additionsByRack = new Map<string, ValidatedLocationRow[]>();
    const additionsByBarcode = new Map<string, ValidatedLocationRow[]>();
    const newRacks: Prisma.LocationRackCreateManyInput[] = [];
    for (const row of newRows) {
      const { plantCode, rackKey: key, materialBarcode, rackNumber, errors } = row;
      const group = locationKey(plantCode, key);
      const assignedBarcode = barcodeByRack.get(group);
      const assignedRack = rackByBarcode.get(materialBarcode);
      if (assignedBarcode && assignedBarcode !== materialBarcode) {
        errors.push(`This rack already uses Material Barcode ${assignedBarcode}. Use it for ${rackNumber}.`);
      } else if (assignedRack && locationKey(assignedRack.plantCode, assignedRack.rackKey) !== group) {
        errors.push(`Material Barcode ${materialBarcode} is already assigned to a different rack in plant ${assignedRack.plantCode}.`);
      }

      if (!errors.length && !assignedBarcode) {
        addToGroup(additionsByRack, group, row);
        addToGroup(additionsByBarcode, materialBarcode, row);
      }
    }

    for (const [barcode, additions] of additionsByBarcode) {
      const groups = new Map<string, ValidatedLocationRow[]>();
      for (const row of additions) {
        addToGroup(groups, locationKey(row.plantCode, row.rackKey), row);
      }
      if (groups.size < 2) continue;

      const rackGroups = Array.from(groups.values());
      const mostLevels = rackGroups.reduce((max, rows) => Math.max(max, rows.length), 0);
      const largestGroups = rackGroups.filter((rows) => rows.length === mostLevels);

      // Suggest keeping the barcode on the largest group. A tie needs user input.
      const preferredGroup = largestGroups.length === 1 ? largestGroups[0] : undefined;
      const preferredRack = preferredGroup?.[0];
      for (const rows of rackGroups) {
        if (rows === preferredGroup) continue;
        const message = preferredRack
          ? `Material Barcode ${barcode} is also used by rack ${preferredRack.rackKey} in plant ${preferredRack.plantCode}. Check the Rack Number or use a different barcode.`
          : `Material Barcode ${barcode} is assigned to multiple racks in this workbook. Use a different barcode for each rack.`;
        for (const row of rows) row.errors.push(message);
      }
    }

    for (const additions of additionsByRack.values()) {
      const barcodesInRack = new Set(additions.map((row) => row.materialBarcode));
      if (barcodesInRack.size > 1) {
        for (const row of additions) {
          row.errors.push('Use one Material Barcode for all levels of this rack.');
        }
        continue;
      }
      const { plantCode, rackKey: key, materialBarcode } = additions[0];
      newRacks.push({ plantCode, rackKey: key, materialBarcode });
    }

    const additions: Prisma.LocationCreateManyInput[] = [];
    const counts = { added: 0, unchanged: 0, invalid: 0, total: rows.length };
    const previewRows = rows.map((row) => {
      if (row.errors.length) {
        counts.invalid++;
        return { ...row, status: 'INVALID' as const };
      }

      const { plantCode, rackNumber, materialBarcode } = row;
      if (levels.has(locationKey(plantCode, rackNumber))) {
        counts.unchanged++;
        return { ...row, status: 'UNCHANGED' as const };
      }

      additions.push({ plantCode, rackNumber, materialBarcode });
      counts.added++;
      return { ...row, status: 'NEW' as const };
    });
    return {
      preview: { canImport: counts.invalid === 0, counts, rows: previewRows },
      additions,
      newRacks,
    };
  }
}
