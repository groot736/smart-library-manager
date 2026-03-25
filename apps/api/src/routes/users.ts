import { Role } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authenticate, authorize(Role.ADMIN), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branch: true,
      isVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(users);
});

router.get("/:id/history", authenticate, authorize(Role.ADMIN, Role.FACULTY), async (req, res) => {
  const userId = String(req.params.id);
  const [transactions, reservations, fines] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, include: { book: true } }),
    prisma.reservation.findMany({ where: { userId }, include: { book: true } }),
    prisma.fine.findMany({ where: { userId } }),
  ]);

  return res.json({ transactions, reservations, fines });
});

export default router;
