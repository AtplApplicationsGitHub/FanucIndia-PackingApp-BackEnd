"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.product.createMany({
        data: [
            { name: 'Robo X1', code: 'X1' },
            { name: 'Robo Y2', code: 'Y2' },
            { name: 'Robo Z3', code: 'Z3' },
        ],
    });
    await prisma.transporter.createMany({
        data: [{ name: 'BlueDart' }, { name: 'DHL' }, { name: 'FedEx' }],
    });
    await prisma.plantCode.createMany({
        data: [
            { code: 'PL001', description: 'Plant 1' },
            { code: 'PL002', description: 'Plant 2' },
            { code: 'PL003', description: 'Plant 3' },
        ],
    });
    await prisma.salesZone.createMany({
        data: [
            { name: 'North' },
            { name: 'South' },
            { name: 'East' },
            { name: 'West' },
        ],
    });
    await prisma.packConfig.createMany({
        data: [
            { configName: '1 SO# 1 Box' },
            { configName: '2 SO# 1 Box' },
            { configName: '3 SO# 1 Box' },
            { configName: '4 SO# 1 Box' },
        ],
    });
    const adminEmail = 'admin@fanuc.com';
    const adminPassword = 'FanucAdmin123';
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });
    if (!existingAdmin) {
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: await bcrypt.hash(adminPassword, 10),
                role: 'admin',
            },
        });
    }
}
main()
    .then(() => {
    prisma.$disconnect();
})
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map