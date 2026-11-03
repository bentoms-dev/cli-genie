import { styleText } from 'node:util';
import * as prompts from '@inquirer/prompts';
import {
  GenieCancelledError,
  GenieError,
  InvalidAnswerError,
  MissingAnswerError,
  isPromptExit,
} from './errors.js';
import { normalizeStep } from './legacy.js';
import { genieTheme, mergeThemes } from './theme.js';
import type {
  Answers,
  Dynamic,
  GenieOptions,
  GenieTheme,
  LegacyQuestion,
  Step,
  StepType,
  SummaryOptions,
} from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrompt = (config: any, context?: any) => Promise<unknown>;

const promptFor = (type: StepType): AnyPrompt => {
  const map: Record<StepType, AnyPrompt> = {
    text: prompts.input,
    password: prompts.password,
    number: prompts.number,
    confirm: prompts.confirm,
    editor: prompts.editor,
    select: prompts.select,
    rawlist: prompts.rawlist,
    checkbox: prompts.checkbox,
    expand: prompts.expand,
    search: prompts.search,
  };
  return map[type];
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

async function resolve<T>(value: Dynamic<T>, answers: Answers): Promise<T> {
  return typeof value === 'function'
    ? await (value as (answers: Answers) => T | Promise<T>)(answers)
    : value;
}

interface NormalizedChoice {
  value: unknown;
  name?: string;
  key?: string;
}

function normalizeChoices(choices: ReadonlyArray<unknown>): NormalizedChoice[] {
  return choices
    .filter((choice) => !prompts.Separator.isSeparator(choice))
    .map((choice) =>
      typeof choice === 'object' && choice !== null && 'value' in choice
        ? (choice as NormalizedChoice)
        : { value: choice },
    );
}

const TRUE_WORDS = new Set(['true', 'yes', 'y', '1', 'on']);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', 'off']);

export class CliGenie {
  readonly steps: readonly Step[];
  readonly options: GenieOptions;
  /** Answers collected by the most recent (or current) run. */
  answers: Answers = {};

  private provided = new Map<string, unknown>();

  constructor(steps: ReadonlyArray<Step | LegacyQuestion>, options?: GenieOptions);
  constructor(options?: GenieOptions);
  constructor(
    stepsOrOptions: ReadonlyArray<Step | LegacyQuestion> | GenieOptions = {},
    options: GenieOptions = {},
  ) {
    this.options = Array.isArray(stepsOrOptions)
      ? { ...options, steps: stepsOrOptions }
      : (stepsOrOptions as GenieOptions);
    this.steps = (this.options.steps ?? []).map(normalizeStep);

    const seen = new Set<string>();
    for (const step of this.steps) {
      if (seen.has(step.name)) throw new GenieError(`Duplicate step name "${step.name}".`);
      seen.add(step.name);
    }
  }

  get interactive(): boolean {
    const setting = this.options.interactive ?? 'auto';
    if (setting !== 'auto') return setting;
    const input = (this.options.context?.input ?? process.stdin) as { isTTY?: boolean };
    return Boolean(input.isTTY);
  }

  /** Ask every step and resolve with the collected answers. */
  async run<T extends Answers = Answers>(): Promise<T> {
    this.answers = {};
    this.provided = new Map();
    for (const [key, value] of Object.entries(this.options.initialAnswers ?? {})) {
      this.provided.set(key, value);
      this.provided.set(normalizeKey(key), value);
    }

    try {
      if (this.options.title && this.interactive) {
        this.write(`\n${styleText('bold', this.options.title)}\n\n`);
      }
      await this.askAll();
      if (this.options.summary && this.interactive) await this.review();

      const replaced = await this.options.hooks?.onComplete?.(this.answers);
      if (replaced) this.answers = replaced;
      return this.answers as T;
    } catch (error) {
      if (isPromptExit(error)) {
        await this.options.hooks?.onCancel?.(this.answers);
        throw new GenieCancelledError(this.answers, { cause: error });
      }
      throw error;
    }
  }

  private get theme(): GenieTheme | undefined {
    const { theme = 'genie', styling } = this.options;
    if (theme === 'plain') return mergeThemes(styling);
    return mergeThemes(genieTheme, theme === 'genie' ? undefined : theme, styling);
  }

  private get context() {
    return this.options.context;
  }

  private write(text: string) {
    (this.context?.output ?? process.stdout).write(text);
  }

  /** Ask any relevant step that has no answer yet and drop answers whose `when` became false. */
  private async askAll() {
    for (const [index, step] of this.steps.entries()) {
      if (step.when && !(await step.when(this.answers))) {
        delete this.answers[step.name];
        continue;
      }
      if (step.name in this.answers) continue;
      await this.askStep(step, index);
    }
  }

  private findProvided(name: string): { found: boolean; value?: unknown } {
    for (const key of [name, normalizeKey(name)]) {
      if (this.provided.has(key)) return { found: true, value: this.provided.get(key) };
    }
    return { found: false };
  }

  private async askStep(step: Step, index: number, edit?: { current: unknown }) {
    let value: unknown;
    const supplied = this.findProvided(step.name);

    if (!edit && supplied.found) {
      value = await this.coerce(step, supplied.value);
    } else if (!this.interactive) {
      value = await this.fallback(step);
    } else {
      value = await this.prompt(step, index, edit);
    }

    if (step.transform) value = await step.transform(value, this.answers);
    this.answers[step.name] = value;
    await this.options.hooks?.onAnswer?.(step.name, value, this.answers);
  }

  private async fallback(step: Step): Promise<unknown> {
    const def = 'default' in step ? await resolve(step.default, this.answers) : undefined;
    if (def !== undefined) {
      if (step.type === 'expand') {
        const choices = await resolve(step.choices, this.answers);
        return choices.find((c) => c.key === def)?.value ?? def;
      }
      return def;
    }
    if (step.type === 'checkbox' && !step.required) return [];
    throw new MissingAnswerError(step.name);
  }

  private async prompt(step: Step, index: number, edit?: { current: unknown }) {
    const answers = this.answers;
    const {
      type,
      name: _name,
      when: _when,
      transform: _transform,
      label: _label,
      theme: stepTheme,
      message,
      ...rest
    } = step;

    const showProgress = this.options.progress !== false && this.steps.length > 1;
    const counter = showProgress
      ? `${styleText('dim', `(${index + 1}/${this.steps.length})`)} `
      : '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {
      ...rest,
      message: counter + (await resolve(message, answers)),
      theme: mergeThemes(this.theme, stepTheme),
    };

    const EDIT_DEFAULT_TYPES: StepType[] = [
      'text',
      'number',
      'confirm',
      'editor',
      'select',
      'rawlist',
    ];
    if (edit && EDIT_DEFAULT_TYPES.includes(type)) {
      config.default = edit.current;
    } else if ('default' in step) {
      config.default = await resolve(step.default, answers);
    }
    if (config.default === undefined) delete config.default;
    if ('choices' in step) config.choices = await resolve(step.choices, answers);

    if (step.type === 'checkbox') {
      delete config.default;
      const checked = edit ? (edit.current as unknown[]) : await resolve(step.default, answers);
      if (checked?.length) {
        config.choices = (config.choices as unknown[]).map((choice) => {
          if (prompts.Separator.isSeparator(choice)) return choice;
          const normalized = normalizeChoices([choice])[0]!;
          return checked.includes(normalized.value)
            ? { ...(choice as object), value: normalized.value, checked: true }
            : choice;
        });
      }
    }

    if ('validate' in step && step.validate) {
      const validate = step.validate as (v: unknown, a: Answers) => unknown;
      config.validate =
        step.type === 'checkbox'
          ? (selected: ReadonlyArray<{ value: unknown }>) =>
              validate(
                selected.map((c) => c.value),
                answers,
              )
          : (value: unknown) => validate(value, answers);
    }
    if (step.type === 'search') {
      config.source = (term: string | undefined, opt: { signal: AbortSignal }) =>
        step.source(term, { ...opt, answers });
    }

    return promptFor(type)(config, this.context);
  }

  /** Convert a supplied answer (often a string from argv/env) to the type the step expects. */
  private async coerce(step: Step, raw: unknown): Promise<unknown> {
    const invalid = (reason: string) => new InvalidAnswerError(step.name, reason);
    let value: unknown;

    switch (step.type) {
      case 'text':
      case 'password':
      case 'editor':
        value = raw === undefined || raw === null ? '' : String(raw);
        if (step.type === 'text' && step.required && !(value as string).trim()) {
          throw invalid('a value is required');
        }
        break;
      case 'number': {
        value = typeof raw === 'number' ? raw : raw === '' ? NaN : Number(raw);
        if (Number.isNaN(value)) throw invalid(`expected a number, got "${String(raw)}"`);
        const n = value as number;
        if (step.min !== undefined && n < step.min) throw invalid(`must be at least ${step.min}`);
        if (step.max !== undefined && n > step.max) throw invalid(`must be at most ${step.max}`);
        break;
      }
      case 'confirm': {
        if (typeof raw === 'boolean') {
          value = raw;
          break;
        }
        const word = String(raw).trim().toLowerCase();
        if (TRUE_WORDS.has(word)) value = true;
        else if (FALSE_WORDS.has(word)) value = false;
        else throw invalid(`expected yes/no, got "${String(raw)}"`);
        break;
      }
      case 'select':
      case 'rawlist':
        value = this.matchChoice(step.name, await resolve(step.choices, this.answers), raw);
        break;
      case 'expand': {
        const choices = await resolve(step.choices, this.answers);
        const byKey = choices.find((c) => c.key === raw);
        value = byKey ? byKey.value : this.matchChoice(step.name, choices, raw);
        break;
      }
      case 'checkbox': {
        const list = Array.isArray(raw)
          ? raw
          : String(raw)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
        const choices = await resolve(step.choices, this.answers);
        value = list.map((item) => this.matchChoice(step.name, choices, item));
        if (step.required && (value as unknown[]).length === 0) {
          throw invalid('select at least one option');
        }
        break;
      }
      case 'search':
        value = raw;
        break;
    }

    if ('validate' in step && step.validate) {
      const validate = step.validate as (v: unknown, a: Answers) => unknown;
      const result = await validate(value, this.answers);
      if (result !== true) {
        throw invalid(typeof result === 'string' ? result : 'failed validation');
      }
    }
    return value;
  }

  private matchChoice(name: string, choices: ReadonlyArray<unknown>, raw: unknown): unknown {
    const options = normalizeChoices(choices);
    const text = String(raw).toLowerCase();
    const match =
      options.find((c) => c.value === raw) ??
      options.find((c) => String(c.value).toLowerCase() === text) ??
      options.find((c) => c.name?.toLowerCase() === text);
    if (!match) {
      const valid = options.map((c) => String(c.value)).join(', ');
      throw new InvalidAnswerError(name, `"${String(raw)}" is not one of: ${valid}`);
    }
    return match.value;
  }

  private labelFor(step: Step): string {
    if (step.label) return step.label;
    return typeof step.message === 'string' ? step.message.replace(/[:?]\s*$/, '') : step.name;
  }

  private format(value: unknown, step: Step, options: SummaryOptions): string {
    if (options.format) return options.format(value, step);
    if (step.type === 'password') return value ? '••••••' : '(none)';
    if (value === undefined || value === null || value === '') return '(none)';
    if (Array.isArray(value)) return value.length ? value.map(String).join(', ') : '(none)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private async review() {
    const summary: SummaryOptions =
      typeof this.options.summary === 'object' ? this.options.summary : {};
    const allowEdit = summary.allowEdit !== false;

    for (;;) {
      const answered = this.steps
        .map((step, index) => ({ step, index }))
        .filter(({ step }) => step.name in this.answers);

      const lines = answered.map(
        ({ step }) =>
          `  ${styleText('dim', `${this.labelFor(step)}:`)} ${this.format(this.answers[step.name], step, summary)}`,
      );
      const message = `${summary.title ?? 'Your wish so far:'}\n${lines.join('\n')}\n\nIs this correct?`;

      const action = await prompts.select(
        {
          message,
          theme: this.theme,
          choices: [
            { name: 'Yes, grant my wish', value: 'confirm' },
            ...(allowEdit && answered.length ? [{ name: 'Change an answer', value: 'edit' }] : []),
            { name: 'Start over', value: 'restart' },
          ],
        },
        this.context,
      );

      if (action === 'confirm') return;
      if (action === 'restart') {
        this.answers = {};
        await this.askAll();
        continue;
      }

      const index = await prompts.select(
        {
          message: 'Which answer would you like to change?',
          theme: this.theme,
          choices: answered.map(({ step, index }) => ({
            name: `${this.labelFor(step)} (${this.format(this.answers[step.name], step, summary)})`,
            value: index,
          })),
        },
        this.context,
      );
      const step = this.steps[index]!;
      await this.askStep(step, index, { current: this.answers[step.name] });
      // Later steps may have become relevant (or irrelevant) because of the change.
      await this.askAll();
    }
  }
}
