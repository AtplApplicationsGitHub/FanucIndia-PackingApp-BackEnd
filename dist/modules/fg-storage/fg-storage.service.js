"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FgStorageService", {
    enumerable: true,
    get: function() {
        return FgStorageService;
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
let FgStorageService = class FgStorageService {
    async assignFgLocation(dto, user) {
        const { saleOrderNumber, fgLocation } = dto;
        const salesOrder = await this.prisma.salesOrder.findUnique({
            where: {
                saleOrderNumber
            }
        });
        if (!salesOrder) {
            throw new _common.NotFoundException(`Sales Order with number '${saleOrderNumber}' not found.`);
        }
        if (user.role === 'USER' && salesOrder.assignedUserId !== user.userId) {
            throw new _common.ForbiddenException('You do not have permission to assign an FG Location to this order.');
        }
        const updatedOrder = await this.prisma.salesOrder.update({
            where: {
                saleOrderNumber
            },
            data: {
                fgLocation: fgLocation
            }
        });
        return {
            message: 'FG Location updated successfully.',
            saleOrderNumber: updatedOrder.saleOrderNumber,
            fgLocation: updatedOrder.fgLocation
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
FgStorageService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService
    ])
], FgStorageService);

//# sourceMappingURL=fg-storage.service.js.map