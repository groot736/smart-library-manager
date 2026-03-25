import { Router } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  chatbotReply,
  forecastDemand,
  generateStudyMode,
  getLeaderboard,
  getBookSummaryByMode,
  getStudyMatches,
  getUserBadges,
  imageSearchBooks,
  predictBookAvailability,
  recommendBooks,
  explainAnyPage,
  semanticSearchBooks,
} from "../services/ai.service";

const router = Router();

const smartSearchSchema = z.object({
  query: z.string().min(2),
});

const chatbotSchema = z.object({
  question: z.string().min(2),
});

const studyModeSchema = z.object({
  bookId: z.string().optional(),
  prompt: z.string().max(300).optional(),
});

const explainPageSchema = z.object({
  text: z.string().min(20),
  mode: z.enum(["simple", "detailed", "exam"]).default("simple"),
});

const imageSearchSchema = z.object({
  imageUrl: z.string().min(5),
  hint: z.string().optional(),
});

router.post("/smart-search", validate(smartSearchSchema), async (req, res) => {
  const books = await semanticSearchBooks(req.body.query);
  return res.json({
    query: req.body.query,
    results: books,
    count: books.length,
  });
});

router.get("/recommendations", authenticate, async (req: AuthRequest, res) => {
  const books = await recommendBooks(req.user!.id);
  return res.json(books);
});

router.get("/forecast", authenticate, async (_req, res) => {
  const forecast = await forecastDemand();
  return res.json(forecast);
});

router.post("/chat", authenticate, validate(chatbotSchema), async (req: AuthRequest, res) => {
  const data = await chatbotReply(req.body.question, req.user?.id);
  return res.json(data);
});

router.post("/chat-public", validate(chatbotSchema), async (req, res) => {
  const data = await chatbotReply(req.body.question);
  return res.json(data);
});

router.post("/study-mode", validate(studyModeSchema), async (req, res) => {
  const data = await generateStudyMode(req.body.bookId, req.body.prompt);
  return res.json(data);
});

router.get("/availability-forecast/:bookId", async (req, res) => {
  const forecast = await predictBookAvailability(String(req.params.bookId));
  if (!forecast) return res.status(404).json({ message: "Book not found" });
  return res.json(forecast);
});

router.get("/study-matches", authenticate, async (req: AuthRequest, res) => {
  const matches = await getStudyMatches(req.user!.id);
  return res.json(matches);
});

router.get("/leaderboard", async (_req, res) => {
  const leaderboard = await getLeaderboard();
  return res.json(leaderboard);
});

router.get("/badges/me", authenticate, async (req: AuthRequest, res) => {
  const badges = await getUserBadges(req.user!.id);
  return res.json(badges);
});

router.post("/explain-page", validate(explainPageSchema), async (req, res) => {
  const data = explainAnyPage(req.body.text, req.body.mode);
  return res.json(data);
});

router.post("/image-search", validate(imageSearchSchema), async (req, res) => {
  const data = await imageSearchBooks(req.body.imageUrl, req.body.hint);
  return res.json(data);
});

router.get("/book-summary/:bookId", async (req, res) => {
  const mode = z.enum(["short", "detailed", "exam"]).catch("short").parse(req.query.mode);
  const data = await getBookSummaryByMode(String(req.params.bookId), mode);
  if (!data) return res.status(404).json({ message: "Book not found" });
  return res.json(data);
});

export default router;
