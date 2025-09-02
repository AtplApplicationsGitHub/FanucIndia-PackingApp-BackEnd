"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDispatchDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_dispatch_dto_1 = require("./create-dispatch.dto");
class UpdateDispatchDto extends (0, swagger_1.PartialType)(create_dispatch_dto_1.CreateDispatchDto) {
}
exports.UpdateDispatchDto = UpdateDispatchDto;
//# sourceMappingURL=update-dispatch.dto.js.map