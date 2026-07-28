import { z } from "zod";

import { isoDateSchema } from "@/validators/leave-request";
import { paginationShape, uuidSchema } from "@/validators/common";

export const userRoleSchema = z.enum(["EMPLOYEE", "MANAGER", "HR", "ADMIN"]);

export const employeeQuerySchema = z.object({
  ...paginationShape,
  search: z.string().trim().max(100).optional(),
  role: userRoleSchema.optional(),
  departmentId: uuidSchema.optional(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sort: z.enum(["name", "email", "createdAt", "role"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
}).strict();

const employeeFields = {
  name: z.string().trim().min(2).max(120),
  role: userRoleSchema,
  departmentId: uuidSchema.nullable().optional(),
  managerId: uuidSchema.nullable().optional(),
  isActive: z.boolean().default(true),
};

export const createEmployeeSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  ...employeeFields,
}).strict();

export const updateEmployeeSchema = z.object({
  name: employeeFields.name.optional(),
  role: employeeFields.role.optional(),
  departmentId: employeeFields.departmentId,
  managerId: employeeFields.managerId,
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const departmentInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const leaveTypeCreateSchema = z.object({
  code: z.string().trim().min(2).max(30).regex(/^[A-Z][A-Z0-9_]*$/),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  isPaid: z.boolean(),
  isActive: z.boolean().default(true),
}).strict();

export const leaveTypeUpdateSchema = leaveTypeCreateSchema.omit({ code: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const policyQuerySchema = z.object({
  ...paginationShape,
  leaveTypeId: uuidSchema.optional(),
  period: z.enum(["current", "upcoming", "all"]).default("all"),
}).strict();

const policyFields = {
  name: z.string().trim().min(2).max(120),
  leaveTypeId: uuidSchema,
  allowanceDays: z.coerce.number().min(0).max(9999),
  maximumCarryOver: z.coerce.number().min(0).max(9999).default(0),
  allowNegative: z.boolean().default(false),
  effectiveFrom: isoDateSchema,
  effectiveTo: isoDateSchema.nullable().optional(),
};

export const policyCreateSchema = z.object(policyFields).strict().refine(
  (value) => !value.effectiveTo || value.effectiveFrom <= value.effectiveTo,
  { path: ["effectiveTo"], message: "End date must not be before start date" },
);

export const policyUpdateSchema = z.object({
  name: policyFields.name.optional(),
  allowanceDays: policyFields.allowanceDays.optional(),
  maximumCarryOver: policyFields.maximumCarryOver.optional(),
  allowNegative: policyFields.allowNegative.optional(),
  effectiveFrom: policyFields.effectiveFrom.optional(),
  effectiveTo: policyFields.effectiveTo,
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const balanceQuerySchema = z.object({
  ...paginationShape,
  search: z.string().trim().max(100).optional(),
  departmentId: uuidSchema.optional(),
  leaveTypeId: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2200).optional(),
}).strict();

export const initializeBalancesSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2200),
  preview: z.boolean().default(true),
}).strict();
