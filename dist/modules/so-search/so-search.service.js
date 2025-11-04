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
        // 1. Search in primary tables (This part remains unchanged)
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
            const [dispatchSOs, materialDetails] = await Promise.all([
                this.prisma.dispatch_SO.findMany({
                    where: {
                        saleOrderNumber
                    },
                    select: {
                        dispatchId: true
                    }
                }),
                this.prisma.eRP_Material_Data.findMany({
                    where: {
                        saleOrderNumber
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
                    address: true,
                    vehicleNumber: true,
                    attachments: true,
                    UpdatedBy: true,
                    UpdatedDate: true,
                    customerName: true,
                    customerId: true,
                    customer: {
                        select: {
                            name: true,
                            address: true
                        }
                    },
                    transporterName: true,
                    transporterId: true,
                    transporter: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            const result = {
                salesOrder,
                dispatchInfo,
                materialDetails,
                isArchived: false
            };
            return convertBigInts(result);
        }
        const archivedSalesOrder = await this.prisma.salesOrderArchive.findFirst({
            where: {
                saleOrderNumber: {
                    equals: saleOrderNumber,
                    mode: 'insensitive'
                }
            }
        });
        if (archivedSalesOrder) {
            const [dispatchSOArchives, materialDetails, materialFiles, statusStepper] = await Promise.all([
                this.prisma.dispatch_SOArchive.findMany({
                    where: {
                        saleOrderNumber
                    },
                    select: {
                        dispatchId: true
                    }
                }),
                this.prisma.eRP_Material_DataArchive.findMany({
                    where: {
                        saleOrderNumber
                    },
                    orderBy: {
                        ID: 'asc'
                    }
                }),
                this.prisma.eRP_Material_FileArchive.findMany({
                    where: {
                        saleOrderNumber
                    }
                }),
                this.prisma.sO_Status_StepperArchive.findMany({
                    where: {
                        salesOrderNumber: saleOrderNumber
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
                    address: true,
                    vehicleNumber: true,
                    attachments: true,
                    UpdatedBy: true,
                    UpdatedDate: true,
                    customerName: true,
                    customerId: true,
                    transporterName: true,
                    transporterId: true
                }
            });
            const dispatchCustomerIds = [
                ...new Set(archivedDispatchesRaw.map((d)=>d.customerId).filter(Boolean))
            ];
            const dispatchTransporterIds = [
                ...new Set(archivedDispatchesRaw.map((d)=>d.transporterId).filter(Boolean))
            ];
            const [dispatchCustomers, dispatchTransporters] = await Promise.all([
                this.prisma.customer.findMany({
                    where: {
                        id: {
                            in: dispatchCustomerIds
                        }
                    }
                }),
                this.prisma.transporter.findMany({
                    where: {
                        id: {
                            in: dispatchTransporterIds
                        }
                    }
                })
            ]);
            const customerMap = new Map(dispatchCustomers.map((c)=>[
                    c.id,
                    c
                ]));
            const transporterMap = new Map(dispatchTransporters.map((t)=>[
                    t.id,
                    t
                ]));
            const dispatchInfo = archivedDispatchesRaw.map((dispatch)=>({
                    ...dispatch,
                    customer: dispatch.customerId ? customerMap.get(dispatch.customerId) : null,
                    transporter: dispatch.transporterId ? transporterMap.get(dispatch.transporterId) : null
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