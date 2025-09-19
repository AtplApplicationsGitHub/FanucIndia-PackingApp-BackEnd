"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DispatchModule", {
    enumerable: true,
    get: function() {
        return DispatchModule;
    }
});
const _common = require("@nestjs/common");
const _dispatchcontroller = require("./dispatch.controller");
const _dispatchservice = require("./dispatch.service");
const _sftpmodule = require("../sftp/sftp.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let DispatchModule = class DispatchModule {
};
DispatchModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _sftpmodule.SftpModule
        ],
        controllers: [
            _dispatchcontroller.DispatchController
        ],
        providers: [
            _dispatchservice.DispatchService
        ]
    })
], DispatchModule);

//# sourceMappingURL=dispatch.module.js.map