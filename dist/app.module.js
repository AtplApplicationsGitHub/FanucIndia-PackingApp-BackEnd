"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppModule", {
    enumerable: true,
    get: function() {
        return AppModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _appcontroller = require("./app.controller");
const _appservice = require("./app.service");
const _salesordermodule = require("./modules/sales-order/sales-order.module");
const _authmodule = require("./modules/auth/auth.module");
const _lookupmodule = require("./modules/lookup/lookup.module");
const _salescrudmodule = require("./modules/sales-crud/sales-crud.module");
const _adminordermodule = require("./modules/admin-order/admin-order.module");
const _prismamodule = require("./prisma.module");
const _usermodule = require("./modules/user/user.module");
const _erpmaterialdatamodule = require("./modules/erp-material-data/erp-material-data.module");
const _erpmaterialfilemodule = require("./modules/erp-material-file/erp-material-file.module");
const _sftpmodule = require("./modules/sftp/sftp.module");
const _userdashboardmodule = require("./modules/user-dashboard/user-dashboard.module");
const _erpmaterialimportermodule = require("./modules/erp-material-importer/erp-material-importer.module");
const _dispatchmodule = require("./modules/dispatch/dispatch.module");
const _sosearchmodule = require("./modules/so-search/so-search.module");
const _fgdashboardmodule = require("./modules/fg-dashboard/fg-dashboard.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AppModule = class AppModule {
};
AppModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _config.ConfigModule.forRoot({
                isGlobal: true
            }),
            _prismamodule.PrismaModule,
            _salesordermodule.SalesOrderModule,
            _authmodule.AuthModule,
            _lookupmodule.LookupModule,
            _salescrudmodule.SalesCrudModule,
            _adminordermodule.AdminOrderModule,
            _usermodule.UserModule,
            _erpmaterialdatamodule.ErpMaterialDataModule,
            _erpmaterialfilemodule.ErpMaterialFileModule,
            _sftpmodule.SftpModule,
            _userdashboardmodule.UserDashboardModule,
            _erpmaterialimportermodule.ErpMaterialImporterModule,
            _dispatchmodule.DispatchModule,
            _sosearchmodule.SoSearchModule,
            _fgdashboardmodule.FgDashboardModule
        ],
        controllers: [
            _appcontroller.AppController
        ],
        providers: [
            _appservice.AppService
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map