import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { GenieError, defineWizard, loadWizard, type WizardDefinition } from '../src/index.js';
import { main } from '../src/cli.js';

const wizard: WizardDefinition = {
  title: 'Test wizard',
  steps: [
    { type: 'text', name: 'email', message: 'Email', pattern: '@', patternMessage: 'Bad email' },
    { type: 'select', name: 'plan', message: 'Plan', choices: ['free', 'pro', 'team'] },
    {
      type: 'number',
      name: 'seats',
      message: 'Seats',
      default: 5,
      when: { plan: ['pro', 'team'] },
    },
  ],
};

const dir = await mkdtemp(join(tmpdir(), 'cli-genie-'));
const file = join(dir, 'wizard.json');
await writeFile(file, JSON.stringify(wizard));
afterAll(() => rm(dir, { recursive: true, force: true }));

describe('defineWizard', () => {
  it('supports declarative `when` and `pattern`', async () => {
    const genie = defineWizard(wizard, { interactive: false });
    await expect(
      defineWizard(wizard, {
        interactive: false,
        initialAnswers: { email: 'a@b', plan: 'free' },
      }).run(),
    ).resolves.toEqual({ email: 'a@b', plan: 'free' });
    await expect(
      defineWizard(wizard, {
        interactive: false,
        initialAnswers: { email: 'a@b', plan: 'pro' },
      }).run(),
    ).resolves.toEqual({ email: 'a@b', plan: 'pro', seats: 5 });
    expect(genie.options.title).toBe('Test wizard');
    await expect(
      defineWizard(wizard, { interactive: false, initialAnswers: { email: 'nope' } }).run(),
    ).rejects.toThrow('Bad email');
  });

  it.each([
    [{}, 'must have a "steps" array'],
    [{ steps: [{ type: 'nope', name: 'a', message: 'b' }] }, 'steps[0].type must be one of'],
    [{ steps: [{ type: 'text', message: 'b' }] }, 'steps[0].name'],
    [{ steps: [{ type: 'select', name: 'a', message: 'b' }] }, 'steps[0].choices'],
  ])('reports invalid definitions (%#)', (definition, message) => {
    expect(() => defineWizard(definition as WizardDefinition)).toThrow(message);
  });
});

describe('loadWizard', () => {
  it('reads a JSON file', async () => {
    const genie = await loadWizard(file);
    expect(genie.steps.map((s) => s.name)).toEqual(['email', 'plan', 'seats']);
  });

  it('wraps read errors in GenieError', async () => {
    await expect(loadWizard(join(dir, 'missing.json'))).rejects.toBeInstanceOf(GenieError);
  });
});

describe('cli', () => {
  const capture = () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let stdout = '';
    let stderr = '';
    return {
      stdout: () => stdout,
      stderr: () => stderr,
      restore: () => {
        stdout = out.mock.calls.map((c) => c[0]).join('');
        stderr = err.mock.calls.map((c) => c[0]).join('');
        out.mockRestore();
        err.mockRestore();
      },
    };
  };

  it('prints answers as JSON', async () => {
    const io = capture();
    const code = await main(['--plan', 'team', file, '--email=a@b', '--non-interactive']);
    io.restore();
    expect(code).toBe(0);
    expect(JSON.parse(io.stdout())).toEqual({ email: 'a@b', plan: 'team', seats: 5 });
  });

  it('reports errors with a non-zero exit code', async () => {
    const io = capture();
    const code = await main([file, '--non-interactive']);
    io.restore();
    expect(code).toBe(1);
    expect(io.stderr()).toContain('No answer provided for "email"');
  });

  it('prints help', async () => {
    const io = capture();
    expect(await main(['--help'])).toBe(0);
    io.restore();
    expect(io.stdout()).toContain('Usage: cli-genie');
  });
});
