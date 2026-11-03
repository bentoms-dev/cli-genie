import { readFile } from 'node:fs/promises';
import { GenieError } from './errors.js';
import { CliGenie } from './genie.js';
import type { Answers, GenieOptions, Step, StepType } from './types.js';

/** A JSON-serialisable step. Functions are replaced by declarative equivalents. */
export interface StepDefinition {
  type: Exclude<StepType, 'search'>;
  name: string;
  message: string;
  label?: string;
  default?: unknown;
  choices?: unknown[];
  required?: boolean;
  /** Regular expression the answer must match (text, password, editor). */
  pattern?: string;
  /** Error shown when `pattern` does not match. */
  patternMessage?: string;
  min?: number;
  max?: number;
  /**
   * Ask only when every listed answer matches. An array value means "any of".
   * e.g. `{ "chooseColor": true }` or `{ "plan": ["pro", "team"] }`
   */
  when?: Record<string, unknown>;
  [option: string]: unknown;
}

export interface WizardDefinition {
  title?: string;
  progress?: boolean;
  summary?: boolean | { title?: string; allowEdit?: boolean };
  steps: StepDefinition[];
}

const TYPES: ReadonlySet<string> = new Set([
  'text',
  'password',
  'number',
  'confirm',
  'editor',
  'select',
  'rawlist',
  'checkbox',
  'expand',
]);
const NEEDS_CHOICES: ReadonlySet<string> = new Set(['select', 'rawlist', 'checkbox', 'expand']);

function toStep(def: StepDefinition, index: number): Step {
  const where = `steps[${index}]`;
  if (typeof def !== 'object' || def === null) throw new GenieError(`${where} must be an object.`);
  if (!TYPES.has(def.type)) {
    throw new GenieError(
      `${where}.type must be one of: ${[...TYPES].join(', ')} (got ${JSON.stringify(def.type)}).`,
    );
  }
  if (typeof def.name !== 'string' || !def.name) {
    throw new GenieError(`${where}.name must be a non-empty string.`);
  }
  if (typeof def.message !== 'string') throw new GenieError(`${where}.message must be a string.`);
  if (NEEDS_CHOICES.has(def.type) && !Array.isArray(def.choices)) {
    throw new GenieError(`${where}.choices must be an array for "${def.type}" steps.`);
  }

  const { when, pattern, patternMessage, ...rest } = def;
  const step = { ...rest } as Step & Record<string, unknown>;

  if (when !== undefined) {
    if (typeof when !== 'object' || when === null) {
      throw new GenieError(`${where}.when must be an object of { answerName: expectedValue }.`);
    }
    step.when = (answers: Answers) =>
      Object.entries(when).every(([key, expected]) =>
        Array.isArray(expected) ? expected.includes(answers[key]) : answers[key] === expected,
      );
  }

  if (pattern !== undefined) {
    const regex = new RegExp(pattern);
    step.validate = (value: unknown) =>
      regex.test(String(value ?? '')) || (patternMessage ?? `Must match ${pattern}`);
  }

  return step;
}

/** Build a `CliGenie` from a plain (JSON) wizard definition. */
export function defineWizard(definition: WizardDefinition, options: GenieOptions = {}): CliGenie {
  if (!definition || !Array.isArray(definition.steps)) {
    throw new GenieError('Wizard definition must have a "steps" array.');
  }
  return new CliGenie({
    title: definition.title,
    progress: definition.progress,
    summary: definition.summary,
    ...options,
    steps: definition.steps.map(toStep),
  });
}

/** Read a JSON wizard definition from disk and build a `CliGenie`. */
export async function loadWizard(path: string, options: GenieOptions = {}): Promise<CliGenie> {
  let definition: WizardDefinition;
  try {
    definition = JSON.parse(await readFile(path, 'utf8')) as WizardDefinition;
  } catch (error) {
    throw new GenieError(`Could not read wizard "${path}": ${(error as Error).message}`, {
      cause: error,
    });
  }
  return defineWizard(definition, options);
}
