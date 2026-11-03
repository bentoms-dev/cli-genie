import type { Answers } from './types.js';

const camelCase = (key: string) =>
  key.toLowerCase().replace(/[-_]+([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/**
 * Collect answers from command-line flags.
 *
 * Supports `--name=value`, `--name value`, `--flag` (true) and `--no-flag` (false).
 * Repeated flags become arrays. Positional arguments are ignored.
 */
export function fromArgv(argv: readonly string[] = process.argv.slice(2)): Answers {
  const answers: Answers = {};
  const set = (key: string, value: unknown) => {
    const name = camelCase(key);
    if (name in answers) {
      const existing = answers[name];
      answers[name] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      answers[name] = value;
    }
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--') break;
    if (!arg.startsWith('--') || arg.length === 2) continue;

    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      set(body.slice(0, eq), body.slice(eq + 1));
    } else if (body.startsWith('no-')) {
      set(body.slice(3), false);
    } else {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        set(body, next);
        i++;
      } else {
        set(body, true);
      }
    }
  }
  return answers;
}

/**
 * Collect answers from environment variables with the given prefix.
 * `GENIE_FIRST_NAME=Ben` becomes `{ firstName: 'Ben' }`.
 */
export function fromEnv(
  prefix = 'GENIE_',
  env: Record<string, string | undefined> = process.env,
): Answers {
  const answers: Answers = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && key.startsWith(prefix) && key.length > prefix.length) {
      answers[camelCase(key.slice(prefix.length))] = value;
    }
  }
  return answers;
}
