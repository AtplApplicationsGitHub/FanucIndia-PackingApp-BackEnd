import { PrismaService } from '../../prisma.service';
export declare class LookupService {
    private prisma;
    constructor(prisma: PrismaService);
    getProducts(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        code: string | null;
    }[]>;
    createProduct(dto: {
        name: string;
        code: string;
    }): import(".prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        name: string;
        code: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateProduct(id: number, dto: {
        name: string;
        code: string;
    }): import(".prisma/client").Prisma.Prisma__ProductClient<{
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
    createTransporter(dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__TransporterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateTransporter(id: number, dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__TransporterClient<{
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
    createPlantCode(dto: {
        code: string;
        description: string;
    }): import(".prisma/client").Prisma.Prisma__PlantCodeClient<{
        id: number;
        code: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePlantCode(id: number, dto: {
        code: string;
        description: string;
    }): import(".prisma/client").Prisma.Prisma__PlantCodeClient<{
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
    createSalesZone(dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__SalesZoneClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateSalesZone(id: number, dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__SalesZoneClient<{
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
    createPackConfig(dto: {
        configName: string;
    }): import(".prisma/client").Prisma.Prisma__PackConfigClient<{
        id: number;
        configName: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePackConfig(id: number, dto: {
        configName: string;
    }): import(".prisma/client").Prisma.Prisma__PackConfigClient<{
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
    createTerminal(dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__TerminalClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateTerminal(id: number, dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__TerminalClient<{
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
    createCustomer(dto: {
        name: string;
        address: string;
    }): import(".prisma/client").Prisma.Prisma__CustomerClient<{
        id: number;
        name: string;
        address: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updateCustomer(id: number, dto: {
        name: string;
        address: string;
    }): import(".prisma/client").Prisma.Prisma__CustomerClient<{
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
    createPrinter(dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__PrinterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    updatePrinter(id: number, dto: {
        name: string;
    }): import(".prisma/client").Prisma.Prisma__PrinterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deletePrinter(id: number): import(".prisma/client").Prisma.Prisma__PrinterClient<{
        id: number;
        name: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
