"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoChatService", {
    enumerable: true,
    get: function() {
        return SoChatService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../prisma.service");
const _sonotificationsservice = require("../so-notifications/so-notifications.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SoChatService = class SoChatService {
    async getSalesOrderOrThrow(soNumber) {
        const salesOrder = await this.prisma.salesOrder.findFirst({
            where: {
                saleOrderNumber: {
                    equals: soNumber,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                userId: true,
                saleOrderNumber: true
            }
        });
        if (!salesOrder) throw new _common.NotFoundException('Sales order not found.');
        return salesOrder;
    }
    enforceSoAccess(user, soOwnerUserId) {
        if (user.role === 'SALES' && user.userId !== soOwnerUserId) {
            throw new _common.ForbiddenException('You are not authorized for this order.');
        }
    }
    async getMentionUsers(user) {
        const where = user.role === 'ADMIN' ? {} : {
            role: 'ADMIN'
        };
        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                role: true
            },
            orderBy: {
                name: 'asc'
            }
        });
    }
    async listMessages(soNumber, user) {
        const so = await this.getSalesOrderOrThrow(soNumber);
        this.enforceSoAccess(user, so.userId);
        const where = user.role === 'ADMIN' ? {
            salesOrderId: so.id
        } : {
            salesOrderId: so.id,
            OR: [
                {
                    fromUserId: user.userId
                },
                {
                    toUserId: user.userId
                }
            ]
        };
        return this.prisma.salesOrderChatMessage.findMany({
            where,
            orderBy: {
                createdAt: 'asc'
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
    }
    async sendMessage(soNumber, user, body) {
        const so = await this.getSalesOrderOrThrow(soNumber);
        this.enforceSoAccess(user, so.userId);
        const message = (body.message || '').trim();
        if (!message) throw new _common.ForbiddenException('Message cannot be empty.');
        if (!body.toUserId) throw new _common.ForbiddenException('Tagged user is required.');
        const toUser = await this.prisma.user.findUnique({
            where: {
                id: Number(body.toUserId)
            },
            select: {
                id: true,
                role: true,
                name: true
            }
        });
        if (!toUser) throw new _common.NotFoundException('Tagged user not found.');
        if (user.role !== 'ADMIN' && toUser.role !== 'ADMIN') {
            throw new _common.ForbiddenException('You can only message ADMIN.');
        }
        const createdMessage = await this.prisma.salesOrderChatMessage.create({
            data: {
                salesOrderId: so.id,
                fromUserId: user.userId,
                toUserId: toUser.id,
                message
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                },
                toUser: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
        await this.soNotificationsService.createAndEmit({
            toUserId: toUser.id,
            salesOrderId: so.id,
            messageId: createdMessage.id,
            fromUsername: createdMessage.fromUser.name,
            saleOrderNumber: so.saleOrderNumber
        });
        return createdMessage;
    }
    constructor(prisma, soNotificationsService){
        this.prisma = prisma;
        this.soNotificationsService = soNotificationsService;
    }
};
SoChatService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _sonotificationsservice.SoNotificationsService === "undefined" ? Object : _sonotificationsservice.SoNotificationsService
    ])
], SoChatService);

//# sourceMappingURL=so-chat.service.js.map