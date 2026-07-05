import { BaseApplicationError, ErrorCode } from '@/lib/core';

/**
 * Error → Arabic message catalog (Business Framework).
 *
 * 03_UI_Specification.md §8: every `ErrorCode` gets exactly one Arabic
 * template; English never reaches the UI. This is the single place where a
 * technical error becomes user-facing text — modules call `getErrorMessage`
 * at the boundary and never hand-write error copy.
 *
 * `Record<ErrorCode, string>` is exhaustive by type: adding a code to
 * lib/core without a message here fails typecheck.
 */
const messageByCode: Record<ErrorCode, string> = {
  [ErrorCode.Unknown]: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
  [ErrorCode.ValidationFailed]: 'البيانات المدخلة غير صحيحة. راجع الحقول المطلوبة.',
  [ErrorCode.AssertionFailed]: 'البيانات المدخلة غير صحيحة. راجع الحقول المطلوبة.',
  [ErrorCode.InvariantViolation]: 'لا يمكن إتمام العملية لأنها تخالف قواعد النظام.',
  [ErrorCode.NotFound]: 'السجل المطلوب غير موجود.',
  [ErrorCode.Conflict]: 'لا يمكن الحفظ لوجود تعارض مع بيانات حالية.',
  [ErrorCode.Unauthorized]: 'يجب تسجيل الدخول لإتمام هذه العملية.',
  [ErrorCode.Forbidden]: 'لا تملك صلاحية لإتمام هذه العملية.',
  [ErrorCode.Timeout]: 'انتهت مهلة الاتصال. تحقق من الشبكة وحاول مجددًا.',
  [ErrorCode.ExternalService]: 'تعذر الاتصال بالخدمة. حاول مرة أخرى بعد قليل.',
  [ErrorCode.Unavailable]: 'الخدمة غير متاحة حاليًا. حاول مرة أخرى بعد قليل.',
  [ErrorCode.NotImplemented]: 'هذه الخاصية غير متاحة بعد.',
  [ErrorCode.Internal]: 'حدث خطأ داخلي. حاول مرة أخرى.',
};

/**
 * Maps any thrown/returned error to its Arabic user message. Every error in
 * the application hierarchy (AppError, DomainError, …) maps by its code;
 * anything else gets the generic unknown-error message. Technical details
 * never leak to the UI — they stay in the structured logs.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof BaseApplicationError) {
    return messageByCode[error.code];
  }
  return messageByCode[ErrorCode.Unknown];
}
