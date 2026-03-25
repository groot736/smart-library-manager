import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import aiRoutes from "./routes/ai";
import analyticsRoutes from "./routes/analytics";
import authRoutes from "./routes/auth";
import booksRoutes from "./routes/books";
import reservationsRoutes from "./routes/reservations";
import transactionsRoutes from "./routes/transactions";
import usersRoutes from "./routes/users";
import { errorHandler, notFound } from "./middlewares/error";

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "library-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", usersRoutes);

app.use(notFound);
app.use(errorHandler);
