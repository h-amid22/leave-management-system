import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthenticationError,
  AuthorizationError,
  InvalidCredentialsError,
} from "@/lib/auth/errors";
import {
  InsufficientLeaveBalanceError,
  LeaveBalanceNotFoundError,
  LeavePolicyNotFoundError,
  LeaveRequestConflictError,
  LeaveRequestNotFoundError,
  LeaveValidationError,
} from "@/services/leave-domain-errors";
import { UserNotFoundError } from "@/services/user-domain-errors";
import { AdminConflictError, AdminNotFoundError, AdminValidationError, ProvisioningError } from "@/services/admin-domain-errors";
import { logger } from "@/lib/observability/logger";
import { RateLimitError } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/observability/request-context";
import { captureException } from "@/lib/observability/monitoring";
import { incrementMetric } from "@/lib/observability/metrics";

const privateHeaders = { "Cache-Control": "private, no-store" };

function errorResponse(
  code: string,
  message: string,
  status: number,
  issues?: unknown,
  headers?: Record<string, string>,
  requestId?: string,
) {
  return NextResponse.json(
    { error: { code, message, ...(issues ? { issues } : {}), ...(requestId ? { requestId } : {}) } },
    { status, headers: { ...privateHeaders, ...headers, ...(requestId ? { "X-Request-ID": requestId } : {}) } },
  );
}

export function createErrorResponse(error: unknown, request?: Request) {
  const { requestId } = getRequestContext(request);
  const respond = (code: string, message: string, status: number, issues?: unknown, headers?: Record<string, string>) =>
    errorResponse(code, message, status, issues, headers, requestId);
  if (error instanceof ZodError) {
    return respond(
      "VALIDATION_ERROR",
      "Validation failed",
      400,
      error.flatten().fieldErrors,
    );
  }

  if (error instanceof InvalidCredentialsError) {
    incrementMetric("authentication_failures_total");
    logger.warn({ event: "authentication_failed", errorName: error.name });
    return respond("INVALID_CREDENTIALS", error.message, 401);
  }

  if (error instanceof AuthenticationError) {
    incrementMetric("authentication_failures_total");
    logger.warn({ event: "authentication_required", errorName: error.name });
    return respond("AUTHENTICATION_REQUIRED", error.message, 401);
  }

  if (error instanceof AuthorizationError) {
    incrementMetric("authorization_failures_total");
    logger.warn({ event: "authorization_failed", errorName: error.name });
    return respond("FORBIDDEN", error.message, 403);
  }

  if (error instanceof AdminValidationError) {
    return respond("ADMIN_VALIDATION_ERROR", error.message, 400);
  }

  if (error instanceof AdminNotFoundError) {
    return respond("ADMIN_RESOURCE_NOT_FOUND", error.message, 404);
  }

  if (error instanceof AdminConflictError) {
    logger.warn({ event: "admin_conflict", errorName: error.name });
    return respond("ADMIN_CONFLICT", error.message, 409);
  }

  if (error instanceof ProvisioningError) {
    logger.error({ event: "invitation_failed", errorName: error.name });
    return respond("PROVISIONING_FAILED", error.message, 502);
  }

  if (error instanceof RequestBodyError || error instanceof LeaveValidationError) {
    return respond("INVALID_REQUEST", error.message, 400);
  }

  if (error instanceof LeaveRequestNotFoundError) {
    return respond("LEAVE_REQUEST_NOT_FOUND", error.message, 404);
  }

  if (error instanceof UserNotFoundError) {
    return respond("USER_NOT_FOUND", error.message, 404);
  }

  if (error instanceof LeaveBalanceNotFoundError) {
    return respond("LEAVE_BALANCE_NOT_FOUND", error.message, 404);
  }

  if (error instanceof LeavePolicyNotFoundError) {
    return respond("LEAVE_POLICY_NOT_FOUND", error.message, 409);
  }

  if (error instanceof InsufficientLeaveBalanceError) {
    return respond("INSUFFICIENT_LEAVE_BALANCE", error.message, 409);
  }

  if (error instanceof LeaveRequestConflictError) {
    logger.warn({ event: "leave_request_conflict", errorName: error.name });
    return respond("LEAVE_REQUEST_CONFLICT", error.message, 409);
  }

  if (error instanceof RateLimitError) {
    logger.warn({ event: "rate_limit_exceeded", errorName: error.name });
    return respond("RATE_LIMITED", error.message, 429, undefined, {
      "Retry-After": String(error.retryAfterSeconds),
    });
  }

  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  logger.error({ event: "unexpected_exception", errorName, errorCode });
  incrementMetric("requests_failed_total");
  void captureException(error, { requestId, errorName, errorCode });
  return respond("INTERNAL_SERVER_ERROR", "Internal server error", 500);
}

export class RequestBodyError extends Error {
  constructor(message = "Request body must contain valid JSON") {
    super(message);
    this.name = "RequestBodyError";
  }
}
