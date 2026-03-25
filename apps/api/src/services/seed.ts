import { prisma } from "../lib/prisma";
import { ensureDemoData } from "./bootstrap.service";

const seed = async () => {
  await ensureDemoData();

  console.log("Seed complete");
};

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
