"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSalesCrudDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_sales_crud_dto_1 = require("./create-sales-crud.dto");
class UpdateSalesCrudDto extends (0, mapped_types_1.PartialType)(create_sales_crud_dto_1.CreateSalesCrudDto) {
}
exports.UpdateSalesCrudDto = UpdateSalesCrudDto;
//# sourceMappingURL=update-sales-crud.dto.js.map