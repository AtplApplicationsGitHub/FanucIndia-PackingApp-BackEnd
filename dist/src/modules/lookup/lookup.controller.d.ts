import { LookupService } from './lookup.service';
export declare class LookupController {
    private readonly lookupService;
    constructor(lookupService: LookupService);
    getProducts(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        code: string | null;
    }[]>;
    getTransporters(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
    }[]>;
    getPlantCodes(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        code: string;
        description: string | null;
    }[]>;
    getSalesZones(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
    }[]>;
    getPackConfigs(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        configName: string;
    }[]>;
}
