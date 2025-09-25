"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FgStorageModule", {
    enumerable: true,
    get: function() {
        return FgStorageModule;
    }
});
const _common = require("@nestjs/common");
const _fgstoragecontroller = require("./fg-storage.controller");
const _fgstorageservice = require("./fg-storage.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let FgStorageModule = class FgStorageModule {
};
FgStorageModule = _ts_decorate([
    (0, _common.Module)({
        controllers: [
            _fgstoragecontroller.FgStorageController
        ],
        providers: [
            _fgstorageservice.FgStorageService
        ]
    })
], FgStorageModule);

//# sourceMappingURL=fg-storage.module.js.map