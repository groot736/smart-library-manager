import { ReservationStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest, authorize } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { sendNotification } from "../services/notification.service";

const router = Router();

const createReservationSchema = z.object({
  bookId: z.string().min(5),
});

router.get("/my", authenticate, async (req: AuthRequest, res) => {
  const reservations = await prisma.reservation.findMany({
    where: { userId: req.user!.id },
    include: { book: true },
    orderBy: { requestedAt: "desc" },
  });

  return res.json(reservations);
});

router.get("/", authenticate, authorize(Role.ADMIN, Role.FACULTY), async (_req, res) => {
  const reservations = await prisma.reservation.findMany({
    include: { user: true, book: true },
    orderBy: [{ status: "asc" }, { requestedAt: "asc" }],
  });

  return res.json(reservations);
});

router.post("/", authenticate, validate(createReservationSchema), async (req: AuthRequest, res) => {
  const existingQueue = await prisma.reservation.count({
    where: { bookId: req.body.bookId, status: { in: [ReservationStatus.PENDING, ReservationStatus.APPROVED] } },
  });

  const reservation = await prisma.reservation.create({
    data: {
      userId: req.user!.id,
      bookId: req.body.bookId,
      queuePosition: existingQueue + 1,
      status: ReservationStatus.PENDING,
    },
    include: { book: true },
  });

  return res.status(201).json(reservation);
});

router.post("/:id/approve", authenticate, authorize(Role.ADMIN, Role.FACULTY), async (req, res) => {
  const id = String(req.params.id);
  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      status: ReservationStatus.APPROVED,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    include: { user: true, book: true },
  });

  await sendNotification({
    to: reservation.user.email,
    subject: "Reservation approved",
    message: `Your reservation for ${reservation.book.title} is approved.`,
  });

  return res.json(reservation);
});

router.post("/:id/reject", authenticate, authorize(Role.ADMIN, Role.FACULTY), async (req, res) => {
  const id = String(req.params.id);
  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status: ReservationStatus.REJECTED },
    include: { user: true, book: true },
  });

  await sendNotification({
    to: reservation.user.email,
    subject: "Reservation rejected",
    message: `Your reservation for ${reservation.book.title} was rejected.`,
  });

  return res.json(reservation);
});

export default router;
