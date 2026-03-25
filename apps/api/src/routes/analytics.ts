import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/dashboard", authenticate, async (_req, res) => {
  const [booksCount, usersCount, activeReservations, issuedStats] = await Promise.all([
    prisma.book.count(),
    prisma.user.count(),
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.transaction.groupBy({
      by: ["bookId"],
      where: { type: "ISSUE" },
      _count: true,
      orderBy: { _count: { bookId: "desc" } },
      take: 8,
    }),
  ]);

  const bookIds = issuedStats.map((row) => row.bookId);
  const books = await prisma.book.findMany({ where: { id: { in: bookIds } } });
  const titleById = new Map(books.map((book) => [book.id, book.title]));

  const topIssued = issuedStats.map((row) => ({
    bookId: row.bookId,
    title: titleById.get(row.bookId) ?? "Unknown",
    issueCount: row._count,
  }));

  return res.json({
    totals: {
      booksCount,
      usersCount,
      activeReservations,
    },
    topIssued,
  });
});

export default router;
