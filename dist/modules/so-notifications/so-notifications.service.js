"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoNotificationsService", {
    enumerable: true,
    get: function() {
        return SoNotificationsService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _sonotificationsgateway = require("./so-notifications.gateway");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SoNotificationsService = class SoNotificationsService {
    async list(user) {
        return this.prisma.soChatNotification.findMany({
            where: {
                userId: user.userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                message: {
                    include: {
                        fromUser: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                salesOrder: {
                    select: {
                        id: true,
                        saleOrderNumber: true
                    }
                }
            }
        });
    }
    async delete(notificationId, user) {
        const n = await this.prisma.soChatNotification.findUnique({
            where: {
                id: notificationId
            },
            select: {
                id: true,
                userId: true
            }
        });
        if (!n) throw new _common.NotFoundException('Notification not found');
        if (n.userId !== user.userId) throw new _common.ForbiddenException('Not allowed');
        await this.prisma.soChatNotification.delete({
            where: {
                id: notificationId
            }
        });
        return {
            ok: true
        };
    }
    async createAndEmit(args) {
        const created = await this.prisma.soChatNotification.create({
            data: {
                userId: args.toUserId,
                salesOrderId: args.salesOrderId,
                messageId: args.messageId
            }
        });
        this.gateway.emitToUser(args.toUserId, {
            id: created.id,
            createdAt: created.createdAt,
            salesOrderNumber: args.saleOrderNumber,
            fromUsername: args.fromUsername,
            messageId: args.messageId
        });
        return created;
    }
    async clearForOrder(salesOrderId, userId) {
        await this.prisma.soChatNotification.deleteMany({
            where: {
                salesOrderId: salesOrderId,
                userId: userId
            }
        });
        return {
            ok: true
        };
    }
    constructor(prisma, gateway){
        this.prisma = prisma;
        this.gateway = gateway;
    }
};
SoNotificationsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sonotificationsgateway.SoNotificationsGateway === "undefined" ? Object : _sonotificationsgateway.SoNotificationsGateway
    ])
], SoNotificationsService);

//# sourceMappingURL=so-notifications.service.js.map