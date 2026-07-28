import { z } from "zod";

import { paginationShape, uuidSchema } from "@/validators/common";

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export const isoDateSchema = z.string().transform((value, context) => {
  const date = parseIsoDate(value);

  if (!date) {
    context.addIssue({ code: "custom", message: "Date must use YYYY-MM-DD" });
    return z.NEVER;
  }

  return date;
});

const dateRangeRefinement = (
  value: { startDate?: Date; endDate?: Date },
  context: z.RefinementCtx,
) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date must not be before start date",
    });
  }
};

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: uuidSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    reason: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .superRefine(dateRangeRefinement);

export const updateLeaveRequestSchema = z
  .object({
    leaveTypeId: uuidSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    reason: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .superRefine(dateRangeRefinement);

export const leaveRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const leaveRequestQuerySchema = z
  .object({
    ...paginationShape,
    status: leaveRequestStatusSchema.optional(),
    leaveTypeId: uuidSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine(dateRangeRefinement);

export const pendingApprovalQuerySchema = z
  .object({
    ...paginationShape,
    leaveTypeId: uuidSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine(dateRangeRefinement);
