import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { configuredHeaders } from '../shared/excel-column-config.util';

export const STOCK_HEADERS = {
  storageType: ['typ'], storageBin: ['storagebin', 'storage bin'], materialCode: ['material', 'material code'],
  plant: ['plnt', 'plant'], storageLocation: ['location'], availableQty: ['avail'], batch: ['batch'],
  stockQty: ['stock'], certificateNo: ['certno', 'cert. no.', 'certificate no'], grDate: ['grdate'],
  grNumber: ['grnumber'], delivery: ['delivery'], lastMovementDate: ['lastmvmt'], lastChanger: ['lastchanger'],
} as const;
export const RESERVATION_HEADERS = {
  materialCode: ['material', 'material code'], qty: ['qty', 'quantity', 'req qty'], soNumber: ['so number', 'so', 'sono'],
} as const;
export const STOCK_COLUMN_KEYS: Record<keyof typeof STOCK_HEADERS, string> = {
  storageType: 'FREE_STOCK_COLUMN_TYPE', storageBin: 'FREE_STOCK_COLUMN_STORAGE_BIN', materialCode: 'FREE_STOCK_COLUMN_MATERIAL',
  plant: 'FREE_STOCK_COLUMN_PLANT', storageLocation: 'FREE_STOCK_COLUMN_LOCATION', availableQty: 'FREE_STOCK_COLUMN_AVAIL',
  batch: 'FREE_STOCK_COLUMN_BATCH', stockQty: 'FREE_STOCK_COLUMN_STOCK', certificateNo: 'FREE_STOCK_COLUMN_CERT_NO',
  grDate: 'FREE_STOCK_COLUMN_GR_DATE', grNumber: 'FREE_STOCK_COLUMN_GR_NUMBER', delivery: 'FREE_STOCK_COLUMN_DELIVERY',
  lastMovementDate: 'FREE_STOCK_COLUMN_LAST_MOVEMENT', lastChanger: 'FREE_STOCK_COLUMN_LAST_CHANGER',
};
export const RESERVATION_COLUMN_KEYS: Record<keyof typeof RESERVATION_HEADERS, string> = {
  materialCode: 'FREE_STOCK_RESERVATION_COLUMN_MATERIAL', qty: 'FREE_STOCK_RESERVATION_COLUMN_QTY', soNumber: 'FREE_STOCK_RESERVATION_COLUMN_SO_NUMBER',
};
export type StockHeaders = Record<keyof typeof STOCK_HEADERS, readonly string[]>;
export type ReservationHeaders = Record<keyof typeof RESERVATION_HEADERS, readonly string[]>;

@Injectable()
export class FreeStockColumnConfigService {
  constructor(private readonly prisma: PrismaService) {}
  stock(): Promise<StockHeaders> { return configuredHeaders(this.prisma, STOCK_COLUMN_KEYS, STOCK_HEADERS); }
  reservations(): Promise<ReservationHeaders> { return configuredHeaders(this.prisma, RESERVATION_COLUMN_KEYS, RESERVATION_HEADERS); }
}
