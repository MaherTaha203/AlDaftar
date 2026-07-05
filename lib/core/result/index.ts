// Result pattern — typed success/failure flow control, no business logic.

export {
  success,
  failure,
  isSuccess,
  isFailure,
  map,
  mapError,
  flatMap,
  match,
  unwrapOr,
  combine,
  fromThrowable,
  fromPromise,
  mapAsync,
  flatMapAsync,
  type Result,
  type AsyncResult,
  type Success,
  type Failure,
} from './result';
