export type ServiceErrorCode =
  | "AUTH_REQUIRED"
  | "PROFILE_MISSING"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "CONFIGURATION_ERROR";

export type ServiceError = {
  code: ServiceErrorCode;
  message: string;
  cause?: string;
};

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const fail = (
  code: ServiceErrorCode,
  message: string,
  cause?: string,
): ServiceResult<never> => ({
  ok: false,
  error: { code, message, ...(cause ? { cause } : {}) },
});

export const databaseFailure = (message: string): ServiceResult<never> =>
  fail("DATABASE_ERROR", "The database operation failed.", message);
