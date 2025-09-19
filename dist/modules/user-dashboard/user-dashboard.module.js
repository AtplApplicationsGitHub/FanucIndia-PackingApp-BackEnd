"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserDashboardModule", {
    enumerable: true,
    get: function() {
        return UserDashboardModule;
    }
});
const _common = require("@nestjs/common");
const _userdashboardcontroller = require("./user-dashboard.controller");
const _userdashboardservice = require("./user-dashboard.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let UserDashboardModule = class UserDashboardModule {
};
UserDashboardModule = _ts_decorate([
    (0, _common.Module)({
        controllers: [
            _userdashboardcontroller.UserDashboardController
        ],
        providers: [
            _userdashboardservice.UserDashboardService
        ]
    })
], UserDashboardModule);

//# sourceMappingURL=user-dashboard.module.js.map