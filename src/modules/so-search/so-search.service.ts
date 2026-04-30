import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

function convertBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = convertBigInts(obj[key]);
      }
    }
  }
  return obj;
}

@Injectable()
export class SoSearchService {
  constructor(private readonly prisma: PrismaService) {}

  private buildErpImportLogWhereClause(
    saleOrderNumber: string,
    outboundDelivery?: string | null,
  ) {
    const searchKeys = [saleOrderNumber];

    if (outboundDelivery) {
      searchKeys.push(`${saleOrderNumber}_${outboundDelivery}`);
    }

    return {
      OR: searchKeys.map((key) => ({
        saleOrderNumber: { equals: key, mode: 'insensitive' as const },
      })),
    };
  }

  async findDetailsBySoNumber(
    saleOrderNumber: string,
    obd: string | undefined,
    user: { userId: number; role: string },
  ) {
    // --- NEW LOGIC: Intercept when no OBD is provided to check for multiples ---
    if (!obd) {
      const activeMatches = await this.prisma.salesOrder.findMany({
        where: {
          saleOrderNumber: { equals: saleOrderNumber, mode: 'insensitive' },
        },
        select: {
          id: true,
          saleOrderNumber: true,
          outboundDelivery: true,
          userId: true,
          salesZoneId: true,
        },
      });
      const archiveMatches = await this.prisma.salesOrderArchive.findMany({
        where: {
          saleOrderNumber: { equals: saleOrderNumber, mode: 'insensitive' },
        },
        select: {
          id: true,
          saleOrderNumber: true,
          outboundDelivery: true,
          userId: true,
          salesZoneId: true,
        },
      });

      let allMatches = [...activeMatches, ...archiveMatches];

      // Filter matches according to user role permissions
      if (user.role === 'SALES') {
        const loggedInUser = await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { salesZoneId: true },
        });

        allMatches = allMatches.filter(
          (o) =>
            o.userId === user.userId ||
            (loggedInUser?.salesZoneId &&
              loggedInUser.salesZoneId === o.salesZoneId),
        );
      }

      if (allMatches.length === 0) {
        throw new NotFoundException(
          `Sales Order with number '${saleOrderNumber}' not found.`,
        );
      }

      // Deduplicate by OBD (to prevent listing duplicates if an order is moving states)
      const uniqueMap = new Map();
      for (const m of allMatches) {
        uniqueMap.set(m.outboundDelivery, {
          saleOrderNumber: m.saleOrderNumber,
          outboundDelivery: m.outboundDelivery,
        });
      }
      const uniqueOrders = Array.from(uniqueMap.values());

      // If multiple OBDs exist, return a special payload back to the UI
      if (uniqueOrders.length > 1) {
        return {
          multiple: true,
          orders: uniqueOrders,
        };
      }

      // If exactly 1 unique order exists, inject its OBD and proceed to fetch details normally
      obd = uniqueOrders[0].outboundDelivery;
    }

    // --- EXISTING LOGIC: Fetch details for the exact SO + OBD combination ---
    const whereActive: any = {
      saleOrderNumber: { equals: saleOrderNumber, mode: 'insensitive' },
    };
    if (obd) {
      whereActive.outboundDelivery = { equals: obd, mode: 'insensitive' };
    }

    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: whereActive,
      include: {
        customer: true,
        product: true,
        transporter: true,
        salesZone: true,
        packConfig: true,
        user: { select: { name: true } },
        assignedUser: { select: { name: true } },
        statusStepper: true,
        attachments: true,
        issueAssignedUser: { select: { name: true, email: true } },
        packingAssignedUser: { select: { name: true, email: true } },
      },
    });

    if (salesOrder) {
      if (user.role === 'SALES') {
        const loggedInUser = await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { salesZoneId: true },
        });

        const isCreator = salesOrder.userId === user.userId;
        const isSameZone =
          loggedInUser?.salesZoneId &&
          loggedInUser.salesZoneId === salesOrder.salesZoneId;

        if (!isCreator && !isSameZone) {
          throw new ForbiddenException(
            'You are not authorized to view this order.',
          );
        }
      }

      const canonicalSoNumber = salesOrder.saleOrderNumber;
      const erpImportLogWhereClause = this.buildErpImportLogWhereClause(
        canonicalSoNumber,
        salesOrder.outboundDelivery,
      );

      let [dispatchSOs, materialDetails, erpImportLogs] = await Promise.all([
        this.prisma.dispatch_SO.findMany({
          where: { salesOrderId: salesOrder.id },
          select: { dispatchId: true },
        }),
        this.prisma.eRP_Material_Data.findMany({
          where: { salesOrderId: salesOrder.id },
          orderBy: { ID: 'asc' },
        }),
        // --- ADD THIS NEW QUERY ---
        this.prisma.eRP_Data_Cron_Logs.findMany({
          where: erpImportLogWhereClause,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      materialDetails =
        await this.mapMaterialUserNamesToEmails(materialDetails);

      const dispatchIds = dispatchSOs.map((dso) => dso.dispatchId);

      const dispatchInfo = await this.prisma.dispatch.findMany({
        where: { id: { in: dispatchIds } },
        select: {
          id: true,
          vehicleNumber: true,
          attachments: true,
          UpdatedBy: true,
          UpdatedDate: true,
          transporterName: true,
          transporterId: true,
          transporter: { select: { name: true } },
          vehicleEntry: {
            select: {
              id: true,
              attachments: true,
            },
          },
        },
      });

      const vehicleEntryIds = dispatchInfo
        .map((d) => d.vehicleEntry?.id)
        .filter((id): id is number => !!id);

      if (vehicleEntryIds.length > 0) {
        const archivedEntries = await this.prisma.vehicleEntryArchive.findMany({
          where: { id: { in: vehicleEntryIds } },
          select: { id: true, attachments: true },
        });

        const archivedPathsMap = new Map<number, Set<string>>();
        for (const arch of archivedEntries) {
          const paths = new Set<string>();
          const atts = (arch.attachments as any[]) || [];
          atts.forEach((a: any) => {
            if (a.path) paths.add(a.path);
            if (a.sftpPath) paths.add(a.sftpPath);
          });
          archivedPathsMap.set(arch.id, paths);
        }

        for (const d of dispatchInfo) {
          if (d.vehicleEntry && d.vehicleEntry.attachments) {
            const archivedPaths = archivedPathsMap.get(d.vehicleEntry.id);
            if (archivedPaths && archivedPaths.size > 0) {
              const activeAtts = (d.vehicleEntry.attachments as any[]) || [];
              d.vehicleEntry.attachments = activeAtts.filter((a) => {
                const p = a.path || a.sftpPath;
                return !archivedPaths.has(p);
              });
            }
          }
        }
      }

      const result = {
        salesOrder,
        dispatchInfo,
        materialDetails,
        erpImportLogs,
        isArchived: false,
      };
      return convertBigInts(result);
    }

    const whereArchive: any = {
      saleOrderNumber: { equals: saleOrderNumber, mode: 'insensitive' },
    };
    if (obd) {
      whereArchive.outboundDelivery = { equals: obd, mode: 'insensitive' };
    }

    const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
      where: whereArchive,
    });

    if (archivedSalesOrder) {
      if (user.role === 'SALES') {
        const loggedInUser = await this.prisma.user.findUnique({
          where: { id: user.userId },
          select: { salesZoneId: true },
        });

        const isCreator = archivedSalesOrder.userId === user.userId;
        const isSameZone =
          loggedInUser?.salesZoneId &&
          loggedInUser.salesZoneId === archivedSalesOrder.salesZoneId;

        if (!isCreator && !isSameZone) {
          throw new ForbiddenException(
            'You are not authorized to view this order.',
          );
        }
      }

      const canonicalSoNumber = archivedSalesOrder.saleOrderNumber;
      const erpImportLogWhereClause = this.buildErpImportLogWhereClause(
        canonicalSoNumber,
        archivedSalesOrder.outboundDelivery,
      );

      let [dispatchSOArchives, materialDetails, materialFiles, statusStepper, erpImportLogs] =
        await Promise.all([
          this.prisma.dispatch_SOArchive.findMany({
            where: { saleOrderNumber: canonicalSoNumber },
            select: { dispatchId: true },
          }),
          this.prisma.eRP_Material_DataArchive.findMany({
            where: { saleOrderNumber: canonicalSoNumber },
            orderBy: { ID: 'asc' },
          }),
          this.prisma.eRP_Material_FileArchive.findMany({
            where: { saleOrderNumber: canonicalSoNumber },
          }),
          this.prisma.sO_Status_StepperArchive.findMany({
            where: { salesOrderNumber: canonicalSoNumber },
          }),
          // --- ADD THIS NEW QUERY ---
          this.prisma.eRP_Data_Cron_Logs.findMany({
            where: erpImportLogWhereClause,
            orderBy: { createdAt: 'desc' },
          }),
        ]);

      materialDetails =
        await this.mapMaterialUserNamesToEmails(materialDetails);

      const [product, customer, transporter, salesZone, packConfig, issueAssignedUser, packingAssignedUser] =
        await Promise.all([
          this.prisma.product.findUnique({
            where: { id: archivedSalesOrder.productId },
          }),
          archivedSalesOrder.customerId
            ? this.prisma.customer.findUnique({
                where: { id: archivedSalesOrder.customerId },
              })
            : null,
          this.prisma.transporter.findUnique({
            where: { id: archivedSalesOrder.transporterId },
          }),
          this.prisma.salesZone.findUnique({
            where: { id: archivedSalesOrder.salesZoneId },
          }),
          this.prisma.packConfig.findUnique({
            where: { id: archivedSalesOrder.packConfigId },
          }),
          archivedSalesOrder.issueAssignedUserId
            ? this.prisma.user.findUnique({
                where: { id: archivedSalesOrder.issueAssignedUserId },
                select: { name: true, email: true },
              })
            : null,
          archivedSalesOrder.packingAssignedUserId
            ? this.prisma.user.findUnique({
                where: { id: archivedSalesOrder.packingAssignedUserId },
                select: { name: true, email: true },
              })
            : null,
        ]);

      const salesOrderWithDetails = {
        ...archivedSalesOrder,
        product,
        customer,
        transporter,
        salesZone,
        packConfig,
        issueAssignedUser,
        packingAssignedUser,
      };

      const dispatchIds = dispatchSOArchives.map((d) => d.dispatchId);

      const archivedDispatchesRaw = await this.prisma.dispatchArchive.findMany({
        where: { id: { in: dispatchIds } },
        select: {
          id: true,
          vehicleNumber: true,
          attachments: true,
          UpdatedBy: true,
          UpdatedDate: true,
          transporterName: true,
          transporterId: true,
          vehicleEntryId: true,
        },
      });

      const dispatchTransporterIds = [
        ...new Set(
          archivedDispatchesRaw.map((d) => d.transporterId).filter(Boolean),
        ),
      ] as number[];
      const vehicleEntryIds = [
        ...new Set(
          archivedDispatchesRaw.map((d) => d.vehicleEntryId).filter(Boolean),
        ),
      ] as number[];

      const [dispatchTransporters, vehicleEntries] = await Promise.all([
        this.prisma.transporter.findMany({
          where: { id: { in: dispatchTransporterIds } },
        }),
        this.prisma.vehicleEntryArchive.findMany({
          where: { id: { in: vehicleEntryIds } },
          select: { id: true, attachments: true },
        }),
      ]);

      const transporterMap = new Map(
        dispatchTransporters.map((t) => [t.id, t]),
      );
      const vehicleEntryMap = new Map(vehicleEntries.map((ve) => [ve.id, ve]));

      const dispatchInfo = archivedDispatchesRaw.map((dispatch) => ({
        ...dispatch,
        transporter: dispatch.transporterId
          ? transporterMap.get(dispatch.transporterId)
          : null,
        vehicleEntry: dispatch.vehicleEntryId
          ? vehicleEntryMap.get(dispatch.vehicleEntryId)
          : null,
      }));

      const result = {
        salesOrder: { ...salesOrderWithDetails, statusStepper },
        dispatchInfo,
        materialDetails,
        materialFiles,
        erpImportLogs,
        isArchived: true,
      };
      return convertBigInts(result);
    }

    throw new NotFoundException(
      `Sales Order with number '${saleOrderNumber}' not found.`,
    );
  }

  private async mapMaterialUserNamesToEmails(materialDetails: any[]) {
    if (!materialDetails || materialDetails.length === 0)
      return materialDetails;

    const userNames = Array.from(
      new Set(
        materialDetails
          .flatMap((m) => [m.IssueUpdatedBy, m.PackingUpdatedBy])
          .filter((v): v is string => !!v && typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    );

    if (userNames.length === 0) return materialDetails;

    const users = await this.prisma.user.findMany({
      where: {
        name: { in: userNames },
      },
      select: {
        name: true,
        email: true,
      },
    });

    const emailMap = new Map(users.map((u) => [u.name, u.email || u.name]));

    return materialDetails.map((m) => ({
      ...m,
      IssueUpdatedBy: m.IssueUpdatedBy
        ? emailMap.get(m.IssueUpdatedBy) || m.IssueUpdatedBy
        : m.IssueUpdatedBy,
      PackingUpdatedBy: m.PackingUpdatedBy
        ? emailMap.get(m.PackingUpdatedBy) || m.PackingUpdatedBy
        : m.PackingUpdatedBy,
    }));
  }
}
