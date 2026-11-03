import type {
  checkbox,
  confirm,
  editor,
  expand,
  input,
  number,
  password,
  rawlist,
  search,
  select,
} from '@inquirer/prompts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Answers = Record<string, any>;

export type Awaitable<T> = T | Promise<T>;

/** A value that can be given directly or computed from the answers collected so far. */
export type Dynamic<T> = T | ((answers: Answers) => Awaitable<T>);

export type ValidateResult = boolean | string;

type ConfigOf<P extends (...args: never[]) => unknown> = Parameters<P>[0];

/** Options handled by CLI Genie itself, shared by every step type. */
export interface StepBase {
  /** Key under which the answer is stored. */
  name: string;
  message: Dynamic<string>;
  /** Only ask this step when the condition returns `true`. */
  when?: (answers: Answers) => Awaitable<boolean>;
  /** Post-process the answer before it is stored. */
  transform?: (value: unknown, answers: Answers) => Awaitable<unknown>;
  /** Short label used in the summary screen. Defaults to the step message. */
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme?: Record<string, any>;
}

type Inherit<C, Omitted extends string = never> = Omit<
  C,
  'message' | 'default' | 'validate' | 'theme' | 'choices' | Omitted
>;

type TextValidate = (value: string, answers: Answers) => Awaitable<ValidateResult>;

export interface TextStep extends StepBase, Inherit<ConfigOf<typeof input>> {
  type: 'text';
  default?: Dynamic<string | undefined>;
  /** Reject empty answers. */
  required?: boolean;
  validate?: TextValidate;
}

export interface PasswordStep extends StepBase, Inherit<ConfigOf<typeof password>> {
  type: 'password';
  validate?: TextValidate;
}

export interface NumberStep extends StepBase, Inherit<ConfigOf<typeof number>> {
  type: 'number';
  default?: Dynamic<number | undefined>;
  validate?: (value: number | undefined, answers: Answers) => Awaitable<ValidateResult>;
}

export interface ConfirmStep extends StepBase, Inherit<ConfigOf<typeof confirm>> {
  type: 'confirm';
  default?: Dynamic<boolean | undefined>;
}

export interface EditorStep extends StepBase, Inherit<ConfigOf<typeof editor>> {
  type: 'editor';
  default?: Dynamic<string | undefined>;
  validate?: TextValidate;
}

export type Choice<V = unknown> =
  | V
  | { value: V; name?: string; description?: string; short?: string; disabled?: boolean | string };

export interface SelectStep extends StepBase, Inherit<ConfigOf<typeof select>> {
  type: 'select';
  choices: Dynamic<ReadonlyArray<Choice>>;
  default?: Dynamic<unknown>;
}

export interface RawlistStep extends StepBase, Inherit<ConfigOf<typeof rawlist>> {
  type: 'rawlist';
  choices: Dynamic<ReadonlyArray<Choice>>;
  default?: Dynamic<unknown>;
}

export interface CheckboxStep extends StepBase, Inherit<ConfigOf<typeof checkbox>> {
  type: 'checkbox';
  choices: Dynamic<ReadonlyArray<Choice>>;
  /** Values that start checked. */
  default?: Dynamic<ReadonlyArray<unknown> | undefined>;
  /** Require at least one selection. */
  required?: boolean;
  /** Receives the selected values. */
  validate?: (values: unknown[], answers: Answers) => Awaitable<ValidateResult>;
}

export interface ExpandChoice {
  key: string;
  value: unknown;
  name?: string;
}

export interface ExpandStep extends StepBase, Inherit<ConfigOf<typeof expand>> {
  type: 'expand';
  choices: Dynamic<ReadonlyArray<ExpandChoice>>;
  default?: Dynamic<string | undefined>;
}

export interface SearchStep extends StepBase, Inherit<ConfigOf<typeof search>, 'source'> {
  type: 'search';
  source: (
    term: string | undefined,
    opt: { signal: AbortSignal; answers: Answers },
  ) => Awaitable<ReadonlyArray<Choice>>;
  validate?: (value: unknown, answers: Answers) => Awaitable<ValidateResult>;
}

export type Step =
  | TextStep
  | PasswordStep
  | NumberStep
  | ConfirmStep
  | EditorStep
  | SelectStep
  | RawlistStep
  | CheckboxStep
  | ExpandStep
  | SearchStep;

export type StepType = Step['type'];

/** Question objects in the shape used by CLI Genie v1 (inquirer-style `input` / `list`). */
export interface LegacyQuestion {
  type: 'input' | 'list';
  name: string;
  message: string;
  choices?: ReadonlyArray<Choice>;
  when?: (answers: Answers) => Awaitable<boolean>;
  validate?: (value: string) => Awaitable<ValidateResult>;
  default?: unknown;
}

export interface PromptContext {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  signal?: AbortSignal;
  clearPromptOnDone?: boolean;
}

export interface GenieHooks {
  /** Called after every answer is stored (including pre-filled answers). */
  onAnswer?: (name: string, value: unknown, answers: Answers) => Awaitable<void>;
  /** Called once all steps are complete. Return an object to replace the final answers. */
  onComplete?: (answers: Answers) => Awaitable<Answers | void>;
  /** Called when the user cancels (Ctrl+C or abort signal). */
  onCancel?: (answers: Answers) => Awaitable<void>;
}

export interface SummaryOptions {
  /** Heading shown above the answers. */
  title?: string;
  /** Format a value for display. */
  format?: (value: unknown, step: Step) => string;
  /** Let the user pick an answer to change before confirming. Default `true`. */
  allowEdit?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenieTheme = Record<string, any>;

export interface GenieOptions {
  steps?: ReadonlyArray<Step | LegacyQuestion>;
  /** Banner printed before the first question. */
  title?: string;
  /** `'genie'` (default), `'plain'` for inquirer's defaults, or a custom inquirer theme object. */
  theme?: 'genie' | 'plain' | GenieTheme;
  /** Show a `(2/5)` progress counter before each question. Default `true`. */
  progress?: boolean;
  /** Show a review screen before finishing. Default `false`. */
  summary?: boolean | SummaryOptions;
  /**
   * Answers supplied up front (e.g. from `fromArgv()` / `fromEnv()`). Matching steps are not
   * asked. Keys match step names case- and separator-insensitively (`--first-name` → `firstName`).
   */
  initialAnswers?: Answers;
  /**
   * `'auto'` (default) prompts only when input is a TTY. When non-interactive, unanswered
   * steps fall back to their default or a `MissingAnswerError` is thrown.
   */
  interactive?: boolean | 'auto';
  hooks?: GenieHooks;
  /** Streams / abort signal passed to every prompt. */
  context?: PromptContext;
  /** @deprecated v1 option, merged into `theme`. */
  styling?: GenieTheme;
  /** @deprecated v1 option, no longer used. */
  promptLibrary?: unknown;
}
