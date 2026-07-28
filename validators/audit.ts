import { z } from "zod";
import { isoDateSchema } from "@/validators/leave-request";
import { paginationShape, uuidSchema } from "@/validators/common";

export const auditQuerySchema = z.object({
  ...paginationShape,
  search: z.string().trim().max(100).optional(),
  action: z.string().trim().max(100).optional(),
  actorUserId: uuidSchema.optional(),
  entityType: z.string().trim().max(100).optional(),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
}).strict().refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
  path: ["endDate"], message: "End date must not be before start date",
});
