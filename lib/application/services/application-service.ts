import {
  failure,
  success,
  ErrorFactory,
  LoggerFactory,
  type AsyncResult,
  type ILogger,
} from '@/lib/core';

/*
 * The single application-layer abstraction (ADR-0001).
 *
 * Concrete services extend this base and run their operations through
 * execute(), which provides the cross-cutting guarantees uniformly: execution
 * timing, exception normalization via ErrorFactory, Result wrapping, and
 * structured logging. No business logic lives here.
 */
export abstract class ApplicationService {
  /** Stable identifier used for logging and diagnostics. */
  readonly serviceName: string;
  protected readonly logger: ILogger;

  protected constructor(serviceName: string, logger?: ILogger) {
    this.serviceName = serviceName;
    this.logger = logger ?? LoggerFactory.create(serviceName);
  }

  /**
   * Runs an operation with timing, logging, and error capture.
   *
   * The callback's resolved value becomes a success Result. Anything thrown
   * (or rejected) is normalized with ErrorFactory.fromUnknown — a thrown
   * AppError passes through unchanged, so callbacks signal typed failures by
   * throwing them. execute() itself never throws.
   */
  protected async execute<T>(operationName: string, callback: () => Promise<T>): AsyncResult<T> {
    const startedAt = Date.now();
    this.logger.debug('operation started', { operation: operationName });
    try {
      const value = await callback();
      this.logger.info('operation succeeded', {
        operation: operationName,
        durationMs: Date.now() - startedAt,
      });
      return success(value);
    } catch (error) {
      const appError = ErrorFactory.fromUnknown(error, `Operation '${operationName}' failed`);
      this.logger.error('operation failed', {
        operation: operationName,
        durationMs: Date.now() - startedAt,
        error: appError,
      });
      return failure(appError);
    }
  }
}
