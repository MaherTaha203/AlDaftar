import type { ErrorCategory } from './error-category';
import type { ErrorCode } from './error-code';

/** Immutable, JSON-safe metadata attached to an error at the throw site. */
export type ErrorContext = Readonly<Record<string, unknown>>;

/** Plain-object form of an application error, safe for logs and API payloads. */
export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly timestamp: string;
  readonly context?: ErrorContext;
  readonly cause?: string;
}

export interface BaseApplicationErrorArgs {
  readonly message: string;
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly context?: ErrorContext;
  readonly cause?: unknown;
}

/*
 * Root of the application error hierarchy.
 *
 * All fields are readonly and `context` is defensively copied and frozen.
 * Concrete subclasses must call `Object.freeze(this)` at the end of their own
 * constructor (freezing here would break subclass field initialization, which
 * runs after `super()` returns).
 */
export abstract class BaseApplicationError extends Error {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly timestamp: string;
  readonly context?: ErrorContext;

  protected constructor(args: BaseApplicationErrorArgs) {
    super(args.message, args.cause !== undefined ? { cause: args.cause } : undefined);
    this.name = new.target.name;
    this.code = args.code;
    this.category = args.category;
    this.timestamp = new Date().toISOString();
    this.context = args.context !== undefined ? Object.freeze({ ...args.context }) : undefined;
  }

  /** Serializes to a plain JSON-safe object; also picked up by JSON.stringify. */
  toJSON(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      timestamp: this.timestamp,
      ...(this.context !== undefined ? { context: this.context } : {}),
      ...(this.cause !== undefined ? { cause: String(this.cause) } : {}),
    };
  }
}
