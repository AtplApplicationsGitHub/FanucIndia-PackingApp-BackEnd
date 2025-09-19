"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LookupService", {
    enumerable: true,
    get: function() {
        return LookupService;
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
let LookupService = class LookupService {
    getProducts() {
        return this.prisma.product.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    }
    createProduct(dto) {
        return this.prisma.product.create({
            data: dto
        });
    }
    updateProduct(id, dto) {
        return this.prisma.product.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteProduct(id) {
        try {
            return await this.prisma.product.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            console.error('Delete error:', error);
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete product: One or more orders depend on this product.');
            }
            throw error;
        }
    }
    getTransporters() {
        return this.prisma.transporter.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    }
    createTransporter(dto) {
        return this.prisma.transporter.create({
            data: dto
        });
    }
    updateTransporter(id, dto) {
        return this.prisma.transporter.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteTransporter(id) {
        try {
            return await this.prisma.transporter.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete transporter: One or more orders depend on this transporter.');
            }
            throw error;
        }
    }
    getPlantCodes() {
        return this.prisma.plantCode.findMany({
            orderBy: {
                code: 'asc'
            }
        });
    }
    createPlantCode(dto) {
        return this.prisma.plantCode.create({
            data: dto
        });
    }
    updatePlantCode(id, dto) {
        return this.prisma.plantCode.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deletePlantCode(id) {
        try {
            return await this.prisma.plantCode.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete plant code: One or more orders depend on this plant code.');
            }
            throw error;
        }
    }
    getSalesZones() {
        return this.prisma.salesZone.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    }
    createSalesZone(dto) {
        return this.prisma.salesZone.create({
            data: dto
        });
    }
    updateSalesZone(id, dto) {
        return this.prisma.salesZone.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteSalesZone(id) {
        try {
            return await this.prisma.salesZone.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete sales zone: One or more orders depend on this sales zone.');
            }
            throw error;
        }
    }
    getPackConfigs() {
        return this.prisma.packConfig.findMany({
            orderBy: {
                configName: 'asc'
            }
        });
    }
    createPackConfig(dto) {
        return this.prisma.packConfig.create({
            data: dto
        });
    }
    updatePackConfig(id, dto) {
        return this.prisma.packConfig.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deletePackConfig(id) {
        try {
            return await this.prisma.packConfig.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete packing configuration: One or more orders depend on this value.');
            }
            throw error;
        }
    }
    getCustomers() {
        return this.prisma.customer.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    }
    createCustomer(dto) {
        return this.prisma.customer.create({
            data: dto
        });
    }
    updateCustomer(id, dto) {
        return this.prisma.customer.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deleteCustomer(id) {
        try {
            return await this.prisma.customer.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete customer: One or more orders depend on this customer.');
            }
            throw error;
        }
    }
    getPrinters() {
        return this.prisma.printer.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    }
    createPrinter(dto) {
        return this.prisma.printer.create({
            data: dto
        });
    }
    updatePrinter(id, dto) {
        return this.prisma.printer.update({
            where: {
                id
            },
            data: dto
        });
    }
    async deletePrinter(id) {
        try {
            return await this.prisma.printer.delete({
                where: {
                    id
                }
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new _common.BadRequestException('Cannot delete printer: One or more entities depend on this printer.');
            }
            throw error;
        }
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
LookupService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], LookupService);

//# sourceMappingURL=lookup.service.js.map