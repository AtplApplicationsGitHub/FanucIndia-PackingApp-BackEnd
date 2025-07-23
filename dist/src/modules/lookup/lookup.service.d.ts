import { PrismaService } from '../../prisma.service';
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
import { CreateTerminalDto } from './dto/createTerminalDto';
import { UpdateTerminalDto } from './dto/updateTerminalDto';
import { CreateCustomerDto } from './dto/createCustomerDto';
import { UpdateCustomerDto } from './dto/updateCustomerDto';
import { CreatePrinterDto } from './dto/createPrinterDto';
import { UpdatePrinterDto } from './dto/updatePrinterDto';
export declare class LookupService {
    private prisma;
    constructor(prisma: PrismaService);
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
    deleteProduct(id: number): import(".prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        name: string;
        code: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    deleteTransporter(id: number): import(".prisma/client").Prisma.Prisma__TransporterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    deletePlantCode(id: number): import(".prisma/client").Prisma.Prisma__PlantCodeClient<{
        id: number;
        code: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    deleteSalesZone(id: number): import(".prisma/client").Prisma.Prisma__SalesZoneClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    deletePackConfig(id: number): import(".prisma/client").Prisma.Prisma__PackConfigClient<{
        id: number;
        configName: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    getTerminals(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
    }[]>;
    createTerminal(dto: CreateTerminalDto): import(".prisma/client").Prisma.Prisma__TerminalClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateTerminal(id: number, dto: UpdateTerminalDto): import(".prisma/client").Prisma.Prisma__TerminalClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deleteTerminal(id: number): import(".prisma/client").Prisma.Prisma__TerminalClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    deleteCustomer(id: number): import(".prisma/client").Prisma.Prisma__CustomerClient<{
        id: number;
        name: string;
        address: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
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
    deletePrinter(id: number): import(".prisma/client").Prisma.Prisma__PrinterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
