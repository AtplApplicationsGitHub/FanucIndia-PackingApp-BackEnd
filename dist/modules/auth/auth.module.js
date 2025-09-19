"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthModule", {
    enumerable: true,
    get: function() {
        return AuthModule;
    }
});
const _common = require("@nestjs/common");
const _authservice = require("./auth.service");
const _authcontroller = require("./auth.controller");
const _jwt = require("@nestjs/jwt");
const _jwtstrategy = require("./jwt.strategy");
const _config = require("@nestjs/config");
const _jwtauthguard = require("./jwt-auth.guard");
const _rolesguard = require("./roles.guard");
const _core = require("@nestjs/core");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AuthModule = class AuthModule {
};
AuthModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _config.ConfigModule,
            _jwt.JwtModule.registerAsync({
                imports: [
                    _config.ConfigModule
                ],
                useFactory: (config)=>({
                        secret: config.get('JWT_SECRET'),
                        signOptions: {
                            expiresIn: '2h'
                        }
                    }),
                inject: [
                    _config.ConfigService
                ]
            })
        ],
        providers: [
            _authservice.AuthService,
            _jwtstrategy.JwtStrategy,
            _core.Reflector,
            {
                provide: _core.APP_GUARD,
                useClass: _jwtauthguard.JwtAuthGuard
            },
            {
                provide: _core.APP_GUARD,
                useClass: _rolesguard.RolesGuard
            }
        ],
        controllers: [
            _authcontroller.AuthController
        ],
        exports: [
            _jwt.JwtModule,
            _jwtstrategy.JwtStrategy
        ]
    })
], AuthModule);

//# sourceMappingURL=auth.module.js.map