import { describe, expect, it } from 'vitest';
import {
  CliGenie,
  InvalidAnswerError,
  MissingAnswerError,
  Separator,
  checkbox,
  confirm,
  expand,
  number,
  select,
  text,
  type Answers,
  type Step,
} from '../src/index.js';

const run = (steps: Step[], initialAnswers: Answers = {}) =>
  new CliGenie({ steps, initialAnswers, interactive: false }).run();

describe('CliGenie (non-interactive)', () => {
  it('detects a non-TTY input as non-interactive', () => {
    const genie = new CliGenie({ context: { input: { isTTY: false } as never } });
    expect(genie.interactive).toBe(false);
  });

  it('uses supplied answers, then defaults', async () => {
    await expect(
      run(
        [
          text({ name: 'name', message: 'Name' }),
          text({ name: 'city', message: 'City', default: (a) => `${a.name}ville` }),
          checkbox({ name: 'tags', message: 'Tags', choices: ['a'] }),
        ],
        { name: 'Ben' },
      ),
    ).resolves.toEqual({ name: 'Ben', city: 'Benville', tags: [] });
  });

  it('throws MissingAnswerError when there is no answer or default', async () => {
    await expect(run([text({ name: 'name', message: 'Name' })])).rejects.toBeInstanceOf(
      MissingAnswerError,
    );
  });

  it('matches answer keys case- and separator-insensitively', async () => {
    await expect(
      run([text({ name: 'firstName', message: 'x' })], { FIRST_NAME: 'Ben' }),
    ).resolves.toEqual({ firstName: 'Ben' });
  });

  it('coerces strings to the step type', async () => {
    const answers = await run(
      [
        number({ name: 'age', message: 'x' }),
        confirm({ name: 'ok', message: 'x' }),
        select({
          name: 'size',
          message: 'x',
          choices: [new Separator(), { name: 'Large', value: 'lg' }, 'sm'],
        }),
        checkbox({ name: 'nums', message: 'x', choices: [1, 2, 3] }),
        expand({ name: 'act', message: 'x', choices: [{ key: 'o', value: 'overwrite' }] }),
      ],
      { age: '42', ok: 'yes', size: 'large', nums: '1, 3', act: 'o' },
    );
    expect(answers).toEqual({ age: 42, ok: true, size: 'lg', nums: [1, 3], act: 'overwrite' });
  });

  it.each<[Step, unknown, string]>([
    [number({ name: 'n', message: 'x' }), 'abc', 'expected a number'],
    [number({ name: 'n', message: 'x', min: 5 }), '1', 'at least 5'],
    [confirm({ name: 'c', message: 'x' }), 'maybe', 'expected yes/no'],
    [select({ name: 's', message: 'x', choices: ['a', 'b'] }), 'z', 'not one of: a, b'],
    [text({ name: 't', message: 'x', required: true }), ' ', 'required'],
    [text({ name: 't', message: 'x', validate: () => 'Nope' }), 'v', 'Nope'],
    [checkbox({ name: 'c', message: 'x', choices: ['a'], required: true }), '', 'at least one'],
  ])('rejects invalid supplied answers (%#)', async (step, value, message) => {
    const result = run([step], { [step.name]: value });
    await expect(result).rejects.toBeInstanceOf(InvalidAnswerError);
    await expect(result).rejects.toThrow(message);
  });

  it('skips steps whose `when` is false', async () => {
    await expect(run([text({ name: 'a', message: 'x', when: () => false })])).resolves.toEqual({});
  });
});
