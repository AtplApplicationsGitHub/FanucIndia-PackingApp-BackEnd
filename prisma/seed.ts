import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  // Insert Products
  await prisma.product.createMany({
    data: [
      { name: 'Robo X1', code: 'X1' },
      { name: 'Robo Y2', code: 'Y2' },
      { name: 'Robo Z3', code: 'Z3' },
    ],
  });
  // Insert Transporters
  await prisma.transporter.createMany({
    data: [{ name: 'BlueDart' }, { name: 'DHL' }, { name: 'FedEx' }],
  });
  // Insert Plant Codes
  await prisma.plantCode.createMany({
    data: [
      { code: 'PL001', description: 'Plant 1' },
      { code: 'PL002', description: 'Plant 2' },
      { code: 'PL003', description: 'Plant 3' },
    ],
  });
  // Insert Sales Zones
  await prisma.salesZone.createMany({
    data: [
      { name: 'North' },
      { name: 'South' },
      { name: 'East' },
      { name: 'West' },
    ],
  });
  // Insert Packing Configs
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
