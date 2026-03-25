import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { calculateFine } from "../services/fine.service";
import { sendNotification } from "../services/notification.service";

const router = Router();

const issueSchema = z.object({
  bookId: z.string().min(5),
  dueInDays: z.number().int().min(1).max(45).default(14),
});

const returnSchema = z.object({
  transactionId: z.string().min(5),
});

router.get("/my", authenticate, async (req: AuthRequest, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user!.id },
    include: { book: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(transactions);
});

router.get("/", authenticate, authorize(Role.ADMIN, Role.FACULTY), async (_req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: { user: true, book: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(transactions);
});

router.post("/issue", authenticate, validate(issueSchema), async (req: AuthRequest, res) => {
  const book = await prisma.book.findUnique({ where: { id: req.body.bookId } });
  if (!book) return res.status(404).json({ message: "Book not found" });
  if (book.availableCopies <= 0) return res.status(400).json({ message: "Book unavailable" });

  const dueDate = new Date(Date.now() + req.body.dueInDays * 24 * 60 * 60 * 1000);

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.book.update({
      where: { id: book.id },
      data: { availableCopies: { decrement: 1 } },
    });

    return tx.transaction.create({
      data: {
        userId: req.user!.id,
        bookId: book.id,
        type: "ISSUE",
        issuedAt: new Date(),
        dueDate,
      },
      include: { book: true },
    });
  });

  await sendNotification({
    to: req.user!.email,
    subject: "Book issued",
    message: `You issued ${transaction.book.title}. Due date: ${dueDate.toDateString()}`,
  });

  return res.status(201).json(transaction);
});

router.post("/return", authenticate, validate(returnSchema), async (req: AuthRequest, res) => {
  const tx = await prisma.transaction.findUnique({
    where: { id: req.body.transactionId },
    include: { book: true, user: true },
  });

  if (!tx) return res.status(404).json({ message: "Transaction not found" });
  if (tx.userId !== req.user!.id && req.user!.role !== Role.ADMIN) return res.status(403).json({ message: "Forbidden" });

  const returnedAt = new Date();
  const fineAmount = tx.dueDate ? calculateFine(tx.dueDate, returnedAt) : 0;

  const updated = await prisma.$transaction(async (trx) => {
    await trx.book.update({
      where: { id: tx.bookId },
      data: { availableCopies: { increment: 1 } },
    });

    const updatedTx = await trx.transaction.create({
      data: {
        userId: tx.userId,
        bookId: tx.bookId,
        type: "RETURN",
        issuedAt: tx.issuedAt,
        returnedAt,
        dueDate: tx.dueDate,
        fineAmount,
      },
      include: { book: true, user: true },
    });

    if (fineAmount > 0) {
      await trx.fine.create({
        data: {
          userId: tx.userId,
          transactionId: tx.id,
          amount: fineAmount,
          reason: "Late return",
        },
      });
    }

    return updatedTx;
  });

  return res.json(updated);
});

router.post("/renew/:id", authenticate, async (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx || tx.userId !== req.user!.id) return res.status(404).json({ message: "Transaction not found" });

  const currentDue = tx.dueDate ?? new Date();
  const newDue = new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);

  const renewal = await prisma.transaction.create({
    data: {
      userId: tx.userId,
      bookId: tx.bookId,
      type: "RENEWAL",
      issuedAt: tx.issuedAt,
      dueDate: newDue,
    },
    include: { book: true },
  });

  return res.json(renewal);
});

export default router;
