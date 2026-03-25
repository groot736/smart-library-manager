import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([Role.STUDENT, Role.FACULTY, Role.ADMIN]).default(Role.STUDENT),
  branch: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const oauthMockSchema = z.object({
  provider: z.enum(["google", "microsoft", "github"]).default("google"),
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum([Role.STUDENT, Role.FACULTY, Role.ADMIN]).default(Role.STUDENT),
  branch: z.string().optional(),
});

const otpSchema = z.object({
  email: z.string().email(),
  otpCode: z.string().length(6),
});

const signAccessToken = (payload: { id: string; email: string; role: Role }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"] });

const signRefreshToken = (payload: { id: string; email: string; role: Role }) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"] });

router.post("/register", validate(registerSchema), async (req, res) => {
  const exists = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (exists) return res.status(409).json({ message: "User already exists" });

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role: req.body.role,
      branch: req.body.branch,
      otpCode,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return res.status(201).json({
    message: "User registered. Verify OTP.",
    otpPreview: otpCode,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post("/verify-otp", validate(otpSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user || user.otpCode !== req.body.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, otpCode: null, otpExpiresAt: null },
  });

  const token = signAccessToken({ id: updated.id, email: updated.email, role: updated.role });
  const refreshToken = signRefreshToken({ id: updated.id, email: updated.email, role: updated.role });
  return res.json({
    token,
    refreshToken,
    user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role },
  });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isValid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

  if (!user.isVerified) {
    return res.status(403).json({ message: "Account not verified" });
  }

  const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

  return res.json({
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post("/refresh", validate(refreshSchema), async (req, res) => {
  try {
    const decoded = jwt.verify(req.body.refreshToken, env.JWT_REFRESH_SECRET) as { id: string; email: string; role: Role };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) return res.status(401).json({ message: "Invalid refresh token" });

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

router.post("/oauth/mock", validate(oauthMockSchema), async (req, res) => {
  const { provider, email, name, role, branch } = req.body;
  const fallbackHash = await bcrypt.hash(`oauth-${provider}-${email}`, 8);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      branch,
      isVerified: true,
    },
    create: {
      email,
      name,
      role,
      branch,
      isVerified: true,
      passwordHash: fallbackHash,
    },
  });

  const token = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });

  return res.json({
    provider,
    token,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, branch: true, isVerified: true },
  });
  return res.json(user);
});

export default router;
