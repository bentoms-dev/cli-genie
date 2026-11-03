import type { Answers, Awaitable, Choice, LegacyQuestion, Step, ValidateResult } from './types.js';

/** @deprecated Use `text({ name, message, validate, default })` instead. */
export function textInputPrompt(
  message: string,
  name: string,
  validate?: (value: string) => Awaitable<ValidateResult>,
  defaultValue?: string,
): LegacyQuestion {
  return { type: 'input', name, message, validate, default: defaultValue };
}

/** @deprecated Use `select({ name, message, choices, when })` instead. */
export function listPrompt(
  message: string,
  name: string,
  choices: ReadonlyArray<Choice>,
  when?: (answers: Answers) => Awaitable<boolean>,
): LegacyQuestion {
  return { type: 'list', name, message, choices, when };
}

export function normalizeStep(step: Step | LegacyQuestion): Step {
  if (step.type === 'input') {
    const { validate, default: def, ...rest } = step;
    return {
      ...rest,
      type: 'text',
      default: def === undefined ? undefined : String(def),
      validate: validate && ((value: string) => validate(value)),
    };
  }
  if (step.type === 'list') {
    const { choices = [], validate: _ignored, ...rest } = step;
    return { ...rest, type: 'select', choices };
  }
  return step as Step;
}
