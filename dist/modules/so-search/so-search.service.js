"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoSearchService", {
    enumerable: true,
    get: function() {
        return SoSearchService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function convertBigInts(obj) {
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
        for(const key in obj){
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = convertBigInts(obj[key]);
            }
        }
    }
    return obj;
}
let SoSearchService = class SoSearchService {
    async findDetailsBySoNumber(saleOrderNumber, user) {
        const salesOrder = await this.prisma.salesOrder.findFirst({
            where: {
                saleOrderNumber: {
                    equals: saleOrderNumber,
                    mode: 'insensitive'
                }
            },
            include: {
                customer: true,
                product: true,
                transporter: true,
                plantCode: true,
                salesZone: true,
                packConfig: true,
                user: {
                    select: {
                        name: true
                    }
                },
                assignedUser: {
                    select: {
                        name: true
                    }
                },
                statusStepper: true
            }
        });
        if (salesOrder) {
            if (user.role === 'SALES' && salesOrder.userId !== user.userId) {
                throw new _common.ForbiddenException('You are not authorized to view this order.');
            }
            const canonicalSoNumber = salesOrder.saleOrderNumber;
            const [dispatchSOs, materialDetails] = await Promise.all([
                this.prisma.dispatch_SO.findMany({
                    where: {
                        saleOrderNumber: canonicalSoNumber
                    },
                    select: {
                        dispatchId: true
                    }
                }),
                this.prisma.eRP_Material_Data.findMany({
                    where: {
                        saleOrderNumber: canonicalSoNumber
                    },
                    orderBy: {
                        ID: 'asc'
                    }
                })
            ]);
            const dispatchIds = dispatchSOs.map((dso)=>dso.dispatchId);
            const dispatchInfo = await this.prisma.dispatch.findMany({
                where: {
                    id: {
                        in: dispatchIds
                    }
                },
                select: {
                    id: true,
                    vehicleNumber: true,
                    attachments: true,
                    UpdatedBy: true,
                    UpdatedDate: true,
                    transporterName: true,
                    transporterId: true,
                    transporter: {
                        select: {
                            name: true
                        }
                    },
                    vehicleEntry: {
                        select: {
                            id: true,
                            attachments: true
                        }
                    }
                }
            });
            const vehicleEntryIds = dispatchInfo.map((d)=>d.vehicleEntry?.id).filter((id)=>!!id);
            if (vehicleEntryIds.length > 0) {
                const archivedEntries = await this.prisma.vehicleEntryArchive.findMany({
                    where: {
                        id: {
                            in: vehicleEntryIds
                        }
                    },
                    select: {
                        id: true,
                        attachments: true
                    }
                });
                const archivedPathsMap = new Map();
                for (const arch of archivedEntries){
                    const paths = new Set();
                    const atts = arch.attachments || [];
                    atts.forEach((a)=>{
                        if (a.path) paths.add(a.path);
                        if (a.sftpPath) paths.add(a.sftpPath);
                    });
                    archivedPathsMap.set(arch.id, paths);
                }
                for (const d of dispatchInfo){
                    if (d.vehicleEntry && d.vehicleEntry.attachments) {
                        const archivedPaths = archivedPathsMap.get(d.vehicleEntry.id);
                        if (archivedPaths && archivedPaths.size > 0) {
                            const activeAtts = d.vehicleEntry.attachments || [];
                            d.vehicleEntry.attachments = activeAtts.filter((a)=>{
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
                isArchived: false
            };
            return convertBigInts(result);
        }
        // 2. Search in Archive tables (Archived Orders)
        const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
            where: {
                saleOrderNumber: {
                    equals: saleOrderNumber,
                    mode: 'insensitive'
                }
            }
        });
        if (archivedSalesOrder) {
            // [FIX] Use the canonical SO Number from the DB record
            const canonicalSoNumber = archivedSalesOrder.saleOrderNumber;
            const [dispatchSOArchives, materialDetails, materialFiles, statusStepper] = await Promise.all([
                this.prisma.dispatch_SOArchive.findMany({
                    where: {
                        saleOrderNumber: canonicalSoNumber
                    },
                    select: {
                        dispatchId: true
                    }
                }),
                this.prisma.eRP_Material_DataArchive.findMany({
                    where: {
                        saleOrderNumber: canonicalSoNumber
                    },
                    orderBy: {
                        ID: 'asc'
                    }
                }),
                this.prisma.eRP_Material_FileArchive.findMany({
                    where: {
                        saleOrderNumber: canonicalSoNumber
                    }
                }),
                this.prisma.sO_Status_StepperArchive.findMany({
                    where: {
                        salesOrderNumber: canonicalSoNumber
                    }
                })
            ]);
            // Fetch related names for archived SalesOrder
            const [product, customer, transporter, plantCode, salesZone, packConfig] = await Promise.all([
                this.prisma.product.findUnique({
                    where: {
                        id: archivedSalesOrder.productId
                    }
                }),
                archivedSalesOrder.customerId ? this.prisma.customer.findUnique({
                    where: {
                        id: archivedSalesOrder.customerId
                    }
                }) : null,
                this.prisma.transporter.findUnique({
                    where: {
                        id: archivedSalesOrder.transporterId
                    }
                }),
                this.prisma.plantCode.findUnique({
                    where: {
                        id: archivedSalesOrder.plantCodeId
                    }
                }),
                this.prisma.salesZone.findUnique({
                    where: {
                        id: archivedSalesOrder.salesZoneId
                    }
                }),
                this.prisma.packConfig.findUnique({
                    where: {
                        id: archivedSalesOrder.packConfigId
                    }
                })
            ]);
            const salesOrderWithDetails = {
                ...archivedSalesOrder,
                product,
                customer,
                transporter,
                plantCode,
                salesZone,
                packConfig
            };
            // Fetch related names for archived Dispatch
            const dispatchIds = dispatchSOArchives.map((d)=>d.dispatchId);
            const archivedDispatchesRaw = await this.prisma.dispatchArchive.findMany({
                where: {
                    id: {
                        in: dispatchIds
                    }
                },
                select: {
                    id: true,
                    vehicleNumber: true,
                    attachments: true,
                    UpdatedBy: true,
                    UpdatedDate: true,
                    transporterName: true,
                    transporterId: true,
                    vehicleEntryId: true
                }
            });
            const dispatchTransporterIds = [
                ...new Set(archivedDispatchesRaw.map((d)=>d.transporterId).filter(Boolean))
            ];
            const vehicleEntryIds = [
                ...new Set(archivedDispatchesRaw.map((d)=>d.vehicleEntryId).filter(Boolean))
            ];
            const [dispatchTransporters, vehicleEntries] = await Promise.all([
                this.prisma.transporter.findMany({
                    where: {
                        id: {
                            in: dispatchTransporterIds
                        }
                    }
                }),
                this.prisma.vehicleEntryArchive.findMany({
                    where: {
                        id: {
                            in: vehicleEntryIds
                        }
                    },
                    select: {
                        id: true,
                        attachments: true
                    }
                })
            ]);
            const transporterMap = new Map(dispatchTransporters.map((t)=>[
                    t.id,
                    t
                ]));
            const vehicleEntryMap = new Map(vehicleEntries.map((ve)=>[
                    ve.id,
                    ve
                ]));
            const dispatchInfo = archivedDispatchesRaw.map((dispatch)=>({
                    ...dispatch,
                    transporter: dispatch.transporterId ? transporterMap.get(dispatch.transporterId) : null,
                    vehicleEntry: dispatch.vehicleEntryId ? vehicleEntryMap.get(dispatch.vehicleEntryId) : null
                }));
            const result = {
                salesOrder: {
                    ...salesOrderWithDetails,
                    statusStepper
                },
                dispatchInfo,
                materialDetails,
                materialFiles,
                isArchived: true
            };
            return convertBigInts(result);
        }
        // 3. If not found in either, throw an error
        throw new _common.NotFoundException(`Sales Order with number '${saleOrderNumber}' not found.`);
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
SoSearchService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], SoSearchService);

//# sourceMappingURL=so-search.service.js.map