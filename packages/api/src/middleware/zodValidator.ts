import type { MiddlewareHandler } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";

/**
 * Typed wrapper around @hono/zod-validator that avoids `as never` / `as any`
 * casts caused by Hono ↔ Zod generic mismatch.
 *
 * Usage:
 *   jsonValidator(myZodSchema)
 *
 * Validated data is available via `c.req.valid("json")`.
 */
export function jsonValidator<T extends ZodType>(schema: T): MiddlewareHandler {
  return zValidator("json", schema as never);
}
