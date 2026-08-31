const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.email.updateMany({
    where: {
      status: {
        in: ['SCHEDULED', 'QUEUED']
      }
    },
    data: {
      status: 'PENDING'
    }
  });
  console.log(`Migrated ${result.count} emails to PENDING status.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
