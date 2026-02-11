"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BulkAssignOrderDto", {
    enumerable: true,
    get: function() {
        return BulkAssignOrderDto;
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
let BulkAssignOrderDto = class BulkAssignOrderDto {
};
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'Array of Sales Order IDs to update',
        type: [
            Number
        ]
    }),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsInt)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], BulkAssignOrderDto.prototype, "salesOrderIds", void 0);
_ts_decorate([
    (0, _swagger.ApiProperty)({
        description: 'ID of the user to assign',
        type: Number
    }),
    (0, _classvalidator.IsInt)(),
    (0, _classvalidator.IsNotEmpty)(),
    _ts_metadata("design:type", Number)
], BulkAssignOrderDto.prototype, "assignedUserId", void 0);

//# sourceMappingURL=bulk-assign-order.dto.js.map