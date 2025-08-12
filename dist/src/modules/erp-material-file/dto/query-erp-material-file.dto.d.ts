export declare class QueryErpMaterialFileDto {
    search?: string;
    saleOrderNumber?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'fileName' | 'ID';
    sortOrder?: 'asc' | 'desc';
}
