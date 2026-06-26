import { randomUUID } from "node:crypto";

type OperationalLogLevel = "info" | "warn" | "error";

type OperationalContext = Record<string, unknown>;

const sensitiveKeyPattern = /(authorization|cookie|email|key|otp|password|phone|secret|token)/i;
const maxArrayEntries = 10;
const maxDepth = 4;

export function createOperationalRequestId() {
  return randomUUID();
}

export function getOperationalMetadata() {
  return {
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "unknown",
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? undefined,
    commitSha: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) ?? undefined,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };
}

export function logOperationalEvent(
  level: OperationalLogLevel,
  event: string,
  context: OperationalContext = {},
) {
  const payload = {
    at: new Date().toISOString(),
    level,
    product: "Trueka",
    event,
    ...getOperationalMetadata(),
    context: sanitizeLogContext(context),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

export function sanitizeLogContext(value: unknown, depth = 0): unknown {
  if (depth > maxDepth) {
    return "[truncated]";
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: getErrorMessage(value),
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, maxArrayEntries).map((entry) => sanitizeLogContext(entry, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => typeof entryValue !== "undefined" && typeof entryValue !== "function")
        .map(([key, entryValue]) => [
          key,
          sensitiveKeyPattern.test(key) ? "[redacted]" : sanitizeLogContext(entryValue, depth + 1),
        ]),
    );
  }

  return String(value);
}
