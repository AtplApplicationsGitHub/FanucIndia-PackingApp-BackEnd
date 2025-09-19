"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateProductDto", {
    enumerable: true,
    get: function() {
        return CreateProductDto;
    }
});
const _classvalidator = require("class-validator");
const _swagger = require("@nestjs/swagger");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CreateProductDto = class CreateProductDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'Fanuc Arm',
        description: 'Name of the product'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        example: 'F-ARM-001',
        description: 'Unique code for the product'
    }),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateProductDto.prototype, "code", void 0);

//# sourceMappingURL=createProductDto.js.map