import { LookupService } from './lookup.service';
import { CreateProductDto } from './dto/createProductDto';
import { UpdateProductDto } from './dto/updateProductDto';
import { CreateTransporterDto } from './dto/createTransporterDto';
import { UpdateTransporterDto } from './dto/updateTransporterDto';
import { CreatePlantCodeDto } from './dto/createPlantCodeDto';
import { UpdatePlantCodeDto } from './dto/updatePlantCodeDto';
import { CreateSalesZoneDto } from './dto/createSalesZoneDto';
import { UpdateSalesZoneDto } from './dto/updateSalesZoneDto';
import { CreatePackConfigDto } from './dto/createPackConfigDto';
import { UpdatePackConfigDto } from './dto/updatePackConfigDto';
import { CreateCustomerDto } from './dto/createCustomerDto';
import { UpdateCustomerDto } from './dto/updateCustomerDto';
import { CreatePrinterDto } from './dto/createPrinterDto';
import { UpdatePrinterDto } from './dto/updatePrinterDto';
export declare class LookupController {
    private readonly lookupService;
    constructor(lookupService: LookupService);
    getProducts(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        code: string | null;
    }[]>;
    createProduct(dto: CreateProductDto): import(".prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        name: string;
        code: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateProduct(id: number, dto: UpdateProductDto): import(".prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        name: string;
        code: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deleteProduct(id: number): Promise<{
        id: number;
        name: string;
        code: string | null;
    }>;
    getTransporters(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
    }[]>;
    createTransporter(dto: CreateTransporterDto): import(".prisma/client").Prisma.Prisma__TransporterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateTransporter(id: number, dto: UpdateTransporterDto): import(".prisma/client").Prisma.Prisma__TransporterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deleteTransporter(id: number): Promise<{
        id: number;
        name: string;
    }>;
    getPlantCodes(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        code: string;
        description: string | null;
    }[]>;
    createPlantCode(dto: CreatePlantCodeDto): import(".prisma/client").Prisma.Prisma__PlantCodeClient<{
        id: number;
        code: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePlantCode(id: number, dto: UpdatePlantCodeDto): import(".prisma/client").Prisma.Prisma__PlantCodeClient<{
        id: number;
        code: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deletePlantCode(id: number): Promise<{
        id: number;
        code: string;
        description: string | null;
    }>;
    getSalesZones(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
    }[]>;
    createSalesZone(dto: CreateSalesZoneDto): import(".prisma/client").Prisma.Prisma__SalesZoneClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateSalesZone(id: number, dto: UpdateSalesZoneDto): import(".prisma/client").Prisma.Prisma__SalesZoneClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deleteSalesZone(id: number): Promise<{
        id: number;
        name: string;
    }>;
    getPackConfigs(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        configName: string;
    }[]>;
    createPackConfig(dto: CreatePackConfigDto): import(".prisma/client").Prisma.Prisma__PackConfigClient<{
        id: number;
        configName: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePackConfig(id: number, dto: UpdatePackConfigDto): import(".prisma/client").Prisma.Prisma__PackConfigClient<{
        id: number;
        configName: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deletePackConfig(id: number): Promise<{
        id: number;
        configName: string;
    }>;
    getCustomers(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        address: string;
    }[]>;
    createCustomer(dto: CreateCustomerDto): import(".prisma/client").Prisma.Prisma__CustomerClient<{
        id: number;
        name: string;
        address: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateCustomer(id: number, dto: UpdateCustomerDto): import(".prisma/client").Prisma.Prisma__CustomerClient<{
        id: number;
        name: string;
        address: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deleteCustomer(id: number): Promise<{
        id: number;
        name: string;
        address: string;
    }>;
    getPrinters(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
    }[]>;
    createPrinter(dto: CreatePrinterDto): import(".prisma/client").Prisma.Prisma__PrinterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePrinter(id: number, dto: UpdatePrinterDto): import(".prisma/client").Prisma.Prisma__PrinterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deletePrinter(id: number): Promise<{
        id: number;
        name: string;
    }>;
}
