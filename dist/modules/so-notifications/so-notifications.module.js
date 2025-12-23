"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoNotificationsModule", {
    enumerable: true,
    get: function() {
        return SoNotificationsModule;
    }
});
const _common = require("@nestjs/common");
const _sonotificationscontroller = require("./so-notifications.controller");
const _sonotificationsgateway = require("./so-notifications.gateway");
const _sonotificationsservice = require("./so-notifications.service");
const _authmodule = require("../auth/auth.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SoNotificationsModule = class SoNotificationsModule {
};
SoNotificationsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _authmodule.AuthModule
        ],
        controllers: [
            _sonotificationscontroller.SoNotificationsController
        ],
        providers: [
            _sonotificationsservice.SoNotificationsService,
            _sonotificationsgateway.SoNotificationsGateway
        ],
        exports: [
            _sonotificationsservice.SoNotificationsService
        ]
    })
], SoNotificationsModule);

//# sourceMappingURL=so-notifications.module.js.map