import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const idParamsSchema = z.object({ id: uuidSchema }).strict();

export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const paginationSchema = z.object(paginationShape).strict();

export const emptyQuerySchema = z.object({}).strict();
