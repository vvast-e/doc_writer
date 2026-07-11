import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const subscriptions = [
  { id: 1, name: 'Месячная', price: 299, period: 1, max_devices: 1, sort_order: 10 },
  { id: 2, name: 'Студенческая', price: 1199, period: 6, max_devices: 2, sort_order: 20 },
  { id: 3, name: 'Годовая', price: 1999, period: 12, max_devices: 3, sort_order: 30 },
];

async function main() {
  for (const sub of subscriptions) {
    await prisma.subscription.upsert({
      where: { id: sub.id },
      update: sub,
      create: { ...sub, currency: 'RUB' },
    });
  }

  const helloCount = await prisma.hello.count();
  if (helloCount === 0) {
    await prisma.hello.create({ data: { message: 'Hello from HumanType backend' } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
