"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesOrderModule", {
    enumerable: true,
    get: function() {
        return SalesOrderModule;
    }
});
const _common = require("@nestjs/common");
const _salesordercontroller = require("./sales-order.controller");
const _salesorderservice = require("./sales-order.service");
const _prismaservice = require("../../prisma.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SalesOrderModule = class SalesOrderModule {
};
SalesOrderModule = _ts_decorate([
    (0, _common.Module)({
        controllers: [
            _salesordercontroller.SalesOrderController
        ],
        providers: [
            _salesorderservice.SalesOrderService,
            _prismaservice.PrismaService
        ]
    })
], SalesOrderModule);

//# sourceMappingURL=sales-order.module.js.map