import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

export interface CycleCountSelection {
  fromDate: string;
  toDate: string;
  sourceSoCount: number;
  qualifyingSoCount: number;
  sourceBinCount: number;
  uploadedBinCount: number;
  matchedBinCount: number;
  excludedBinCount: number;
}

@Injectable()
export class CycleCountSourceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBins(start: Date, end: Date) {
    const [result] = await this.prisma.$queryRaw<{
      sourceSoCount: number;
      qualifyingSoCount: number;
      bins: string[];
    }[]>`
      WITH orders AS (
        SELECT "id", "saleOrderNumber", "outboundDelivery", "binCount" FROM "SalesOrder"
        UNION ALL
        SELECT "id", "saleOrderNumber", "outboundDelivery", "binCount" FROM "SalesOrderArchive"
      ), dated_materials AS (
        SELECT "salesOrderId", "saleOrderNumber", "FG_OBD" FROM "ERP_Material_Data"
        WHERE "IssueUpdatedDate" >= ${start} AND "IssueUpdatedDate" < ${end}
        UNION ALL
        SELECT "salesOrderId", "saleOrderNumber", "FG_OBD" FROM "ERP_Material_DataArchive"
        WHERE "IssueUpdatedDate" >= ${start} AND "IssueUpdatedDate" < ${end}
      ), selected_order_ids AS (
        SELECT "salesOrderId" AS id FROM dated_materials WHERE "salesOrderId" IS NOT NULL
        UNION
        SELECT o."id" FROM orders o
        JOIN dated_materials m ON m."saleOrderNumber" = o."saleOrderNumber"
          AND COALESCE(m."FG_OBD", '') = o."outboundDelivery"
        WHERE m."salesOrderId" IS NULL
      ), selected_orders AS (
        SELECT DISTINCT o."id", o."saleOrderNumber", o."outboundDelivery", o."binCount"
        FROM orders o JOIN selected_order_ids s ON s.id = o."id"
      ), qualifying_orders AS (
        SELECT * FROM selected_orders WHERE "binCount" > 1
      ), materials AS NOT MATERIALIZED (
        SELECT "salesOrderId", "saleOrderNumber", "FG_OBD", "Bin_No" FROM "ERP_Material_Data"
        UNION ALL
        SELECT "salesOrderId", "saleOrderNumber", "FG_OBD", "Bin_No" FROM "ERP_Material_DataArchive"
      ), bins AS (
        SELECT UPPER(BTRIM(m."Bin_No")) AS bin
        FROM materials m JOIN qualifying_orders o ON m."salesOrderId" = o."id"
        WHERE BTRIM(m."Bin_No") <> ''
        UNION
        SELECT UPPER(BTRIM(m."Bin_No")) AS bin
        FROM materials m JOIN qualifying_orders o ON m."saleOrderNumber" = o."saleOrderNumber"
          AND COALESCE(m."FG_OBD", '') = o."outboundDelivery"
        WHERE m."salesOrderId" IS NULL AND BTRIM(m."Bin_No") <> ''
      )
      SELECT
        (SELECT COUNT(DISTINCT "id")::int FROM selected_orders) AS "sourceSoCount",
        (SELECT COUNT(DISTINCT "id")::int FROM qualifying_orders) AS "qualifyingSoCount",
        ARRAY(SELECT bin FROM bins ORDER BY bin) AS bins
    `;
    return result;
  }
}
