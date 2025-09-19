"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ErpMaterialFileModule", {
    enumerable: true,
    get: function() {
        return ErpMaterialFileModule;
    }
});
const _common = require("@nestjs/common");
const _prismamodule = require("../../prisma.module");
const _sftpmodule = require("../sftp/sftp.module");
const _erpmaterialfilecontroller = require("./erp-material-file.controller");
const _erpmaterialfileservice = require("./erp-material-file.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ErpMaterialFileModule = class ErpMaterialFileModule {
};
ErpMaterialFileModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _prismamodule.PrismaModule,
            _sftpmodule.SftpModule
        ],
        controllers: [
            _erpmaterialfilecontroller.ErpMaterialFileController
        ],
        providers: [
            _erpmaterialfileservice.ErpMaterialFileService
        ],
        exports: [
            _erpmaterialfileservice.ErpMaterialFileService
        ]
    })
], ErpMaterialFileModule);

//# sourceMappingURL=erp-material-file.module.js.map