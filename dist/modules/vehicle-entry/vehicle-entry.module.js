"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VehicleEntryModule", {
    enumerable: true,
    get: function() {
        return VehicleEntryModule;
    }
});
const _common = require("@nestjs/common");
const _vehicleentrycontroller = require("./vehicle-entry.controller");
const _vehicleentryservice = require("./vehicle-entry.service");
const _prismamodule = require("../../prisma.module");
const _sftpmodule = require("../sftp/sftp.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let VehicleEntryModule = class VehicleEntryModule {
};
VehicleEntryModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _prismamodule.PrismaModule,
            _sftpmodule.SftpModule
        ],
        controllers: [
            _vehicleentrycontroller.VehicleEntryController
        ],
        providers: [
            _vehicleentryservice.VehicleEntryService
        ]
    })
], VehicleEntryModule);

//# sourceMappingURL=vehicle-entry.module.js.map