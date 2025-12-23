"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoNotificationsGateway", {
    enumerable: true,
    get: function() {
        return SoNotificationsGateway;
    }
});
const _websockets = require("@nestjs/websockets");
const _socketio = require("socket.io");
const _jwt = require("@nestjs/jwt");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SoNotificationsGateway = class SoNotificationsGateway {
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token;
            if (!token) return client.disconnect(true);
            const payload = await this.jwtService.verifyAsync(token);
            const userId = payload?.sub;
            if (!userId) return client.disconnect(true);
            client.join(`user:${userId}`);
        } catch  {
            client.disconnect(true);
        }
    }
    emitToUser(userId, payload) {
        this.server.to(`user:${userId}`).emit('notification:new', payload);
    }
    constructor(jwtService){
        this.jwtService = jwtService;
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], SoNotificationsGateway.prototype, "server", void 0);
SoNotificationsGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true
        }
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService
    ])
], SoNotificationsGateway);

//# sourceMappingURL=so-notifications.gateway.js.map