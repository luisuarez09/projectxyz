export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "CONFLICT"
        | "INFRASTRUCTURE";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
