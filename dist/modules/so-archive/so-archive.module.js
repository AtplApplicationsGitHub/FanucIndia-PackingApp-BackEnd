"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SoArchiveModule", {
    enumerable: true,
    get: function() {
        return SoArchiveModule;
    }
});
const _common = require("@nestjs/common");
const _soarchiveservice = require("./so-archive.service");
const _soarchivecontroller = require("./so-archive.controller");
const _prismamodule = require("../../prisma.module");
const _sftpmodule = require("../sftp/sftp.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SoArchiveModule = class SoArchiveModule {
};
SoArchiveModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _prismamodule.PrismaModule,
            _sftpmodule.SftpModule
        ],
        controllers: [
            _soarchivecontroller.SoArchiveController
        ],
        providers: [
            _soarchiveservice.SoArchiveService
        ]
    })
], SoArchiveModule);

//# sourceMappingURL=so-archive.module.js.map