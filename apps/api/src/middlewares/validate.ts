import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

export const validate = <T>(schema: ZodType<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    req.body = parsed.data;
    return next();
  };
};
