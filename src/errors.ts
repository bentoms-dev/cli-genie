import type { Answers } from './types.js';

export class GenieError extends Error {
  override name = 'GenieError';
}

/** Thrown when the user presses Ctrl+C or the prompt is aborted. */
export class GenieCancelledError extends GenieError {
  override name = 'GenieCancelledError';

  constructor(
    readonly answers: Answers,
    options?: { cause?: unknown },
  ) {
    super('The wish was cancelled.', options);
  }
}

/** Thrown in non-interactive mode when a step has no supplied answer and no default. */
export class MissingAnswerError extends GenieError {
  override name = 'MissingAnswerError';

  constructor(readonly step: string) {
    super(`No answer provided for "${step}" and it has no default (running non-interactively).`);
  }
}

/** Thrown when a supplied (non-interactive) answer fails coercion or validation. */
export class InvalidAnswerError extends GenieError {
  override name = 'InvalidAnswerError';

  constructor(
    readonly step: string,
    reason: string,
  ) {
    super(`Invalid answer for "${step}": ${reason}`);
  }
}

export function isCancelled(error: unknown): error is GenieCancelledError {
  return error instanceof GenieCancelledError;
}

export function isPromptExit(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.name === 'AbortPromptError')
  );
}
