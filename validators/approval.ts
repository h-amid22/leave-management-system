import { z } from "zod";

export const approveRequestSchema = z
  .object({
    comment: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const rejectRequestSchema = z
  .object({
    comment: z.string().trim().min(1).max(1000),
  })
  .strict();
