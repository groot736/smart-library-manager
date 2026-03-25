import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { autoTagBook } from "../services/ai.service";

const router = Router();

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(5),
  description: z.string().min(10),
  category: z.string().min(2),
  tags: z.array(z.string()).optional(),
  coverUrl: z.string().url().optional(),
  publishedYear: z.number().int().optional(),
  totalCopies: z.number().int().min(1),
  availableCopies: z.number().int().min(0),
  rating: z.number().min(0).max(5).optional(),
  language: z.string().optional(),
  branch: z.string().optional(),
});

router.get("/", async (req, res) => {
  const { q, category, author, available, minRating } = req.query;

  const books = await prisma.book.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: String(q), mode: "insensitive" } },
                { author: { contains: String(q), mode: "insensitive" } },
                { description: { contains: String(q), mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category: { equals: String(category), mode: "insensitive" } } : {},
        author ? { author: { contains: String(author), mode: "insensitive" } } : {},
        available === "true" ? { availableCopies: { gt: 0 } } : {},
        minRating ? { rating: { gte: Number(minRating) } } : {},
      ],
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return res.json(books);
});

router.get("/home-feed", async (_req, res) => {
  const [trending, newlyAdded, recommended] = await Promise.all([
    prisma.book.findMany({ orderBy: [{ rating: "desc" }], take: 10 }),
    prisma.book.findMany({ orderBy: [{ createdAt: "desc" }], take: 10 }),
    prisma.book.findMany({ where: { availableCopies: { gt: 0 } }, orderBy: [{ rating: "desc" }], take: 10 }),
  ]);

  return res.json({ trending, newlyAdded, recommended });
});

router.get("/scan/:code", async (req, res) => {
  const code = String(req.params.code).trim();

  const book = await prisma.book.findFirst({
    where: {
      OR: [
        { isbn: { equals: code, mode: "insensitive" } },
        { id: { equals: code } },
      ],
    },
  });

  if (!book) return res.status(404).json({ message: "No book found for scanned code" });
  return res.json({ scannedCode: code, mode: "barcode-rfid-sim", book });
});

router.get("/:id", async (req, res) => {
  const book = await prisma.book.findUnique({
    where: { id: req.params.id },
    include: { reservations: true, transactions: true },
  });

  if (!book) return res.status(404).json({ message: "Book not found" });

  const recommendations = await prisma.book.findMany({
    where: {
      category: book.category,
      id: { not: book.id },
    },
    take: 6,
    orderBy: { rating: "desc" },
  });

  return res.json({ ...book, recommendations });
});

router.post("/", authenticate, authorize(Role.ADMIN), validate(createBookSchema), async (req, res) => {
  const input = req.body;
  const book = await prisma.book.create({
    data: {
      ...input,
      tags: input.tags?.length ? input.tags : autoTagBook(input.description, input.category),
      branch: input.branch ?? "Main",
      language: input.language ?? "English",
      rating: input.rating ?? 4,
    },
  });

  return res.status(201).json(book);
});

router.put("/:id", authenticate, authorize(Role.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  const book = await prisma.book.update({
    where: { id },
    data: req.body,
  });
  return res.json(book);
});

router.delete("/:id", authenticate, authorize(Role.ADMIN), async (req, res) => {
  const id = String(req.params.id);
  await prisma.book.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
