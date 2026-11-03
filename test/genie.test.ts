import { describe, expect, it, vi } from 'vitest';
import { screen } from '@inquirer/testing/vitest';
import {
  CliGenie,
  GenieCancelledError,
  checkbox,
  confirm,
  listPrompt,
  number,
  select,
  text,
  textInputPrompt,
} from '../src/index.js';

const interactive = { interactive: true, theme: 'plain' as const };

/** Wait until the current prompt shows `text`. Prompts render asynchronously between steps. */
const prompted = (text: string) =>
  vi.waitFor(() => expect(screen.getScreen()).toContain(text), { timeout: 2000 });

describe('CliGenie (interactive)', () => {
  it('asks each step in order, shows progress and resolves with the answers', async () => {
    const genie = new CliGenie({
      ...interactive,
      steps: [
        text({ name: 'name', message: 'Your name?' }),
        select({ name: 'color', message: 'Colour?', choices: ['Red', 'Green'] }),
      ],
    });
    const result = genie.run();

    await prompted('(1/2) Your name?');
    screen.type('Ben');
    screen.keypress('enter');

    await prompted('(2/2) Colour?');
    screen.keypress('down');
    screen.keypress('enter');

    await expect(result).resolves.toEqual({ name: 'Ben', color: 'Green' });
  });

  it('can hide the progress counter', async () => {
    const result = new CliGenie({
      ...interactive,
      progress: false,
      steps: [text({ name: 'a', message: 'A?' }), text({ name: 'b', message: 'B?' })],
    }).run();

    await prompted('A?');
    expect(screen.getScreen()).not.toContain('(1/2)');
    screen.keypress('enter');
    await prompted('B?');
    screen.keypress('enter');
    await result;
  });

  it.each([
    ['Yes', true, { chooseColor: true, color: 'Red' }],
    ['No', false, { chooseColor: false }],
  ])('passes earlier answers to `when` (%s)', async (_label, yes, expected) => {
    const result = new CliGenie({
      ...interactive,
      steps: [
        confirm({ name: 'chooseColor', message: 'Choose a colour?' }),
        select({
          name: 'color',
          message: 'Colour?',
          choices: ['Red', 'Green'],
          when: (answers) => answers.chooseColor === true,
        }),
      ],
    }).run();

    await prompted('Choose a colour?');
    screen.type(yes ? 'y' : 'n');
    screen.keypress('enter');
    if (yes) {
      await prompted('Colour?');
      screen.keypress('enter');
    }
    await expect(result).resolves.toEqual(expected);
  });

  it('resolves dynamic messages, defaults and choices from earlier answers', async () => {
    const result = new CliGenie({
      ...interactive,
      progress: false,
      steps: [
        text({ name: 'name', message: 'Name?' }),
        text({
          name: 'greeting',
          message: (a) => `Greeting for ${a.name}?`,
          default: (a) => `Hi ${a.name}`,
        }),
        select({ name: 'pick', message: 'Pick', choices: (a) => [a.name, 'Other'] }),
      ],
    }).run();

    await prompted('Name?');
    screen.type('Ben');
    screen.keypress('enter');
    await prompted('Greeting for Ben?');
    screen.keypress('enter');
    await prompted('❯ Ben');
    screen.keypress('enter');

    await expect(result).resolves.toEqual({ name: 'Ben', greeting: 'Hi Ben', pick: 'Ben' });
  });

  it('passes answers to validate and shows validation errors', async () => {
    const validate = vi.fn((value: string, answers) =>
      value === answers.password ? true : 'Passwords do not match',
    );
    const result = new CliGenie({
      ...interactive,
      progress: false,
      initialAnswers: { password: 'secret' },
      steps: [
        text({ name: 'password', message: 'Password' }),
        text({ name: 'repeat', message: 'Repeat', validate }),
      ],
    }).run();

    await prompted('Repeat');
    screen.type('nope');
    screen.keypress('enter');
    await prompted('Passwords do not match');

    for (let i = 0; i < 4; i++) screen.keypress('backspace');
    screen.type('secret');
    screen.keypress('enter');
    await expect(result).resolves.toEqual({ password: 'secret', repeat: 'secret' });
    expect(validate).toHaveBeenCalledWith(
      'secret',
      expect.objectContaining({ password: 'secret' }),
    );
  });

  it('runs transform and lifecycle hooks', async () => {
    const onAnswer = vi.fn();
    const result = new CliGenie({
      ...interactive,
      steps: [number({ name: 'age', message: 'Age?', transform: (v) => (v as number) * 2 })],
      hooks: {
        onAnswer,
        onComplete: (answers) => ({ ...answers, done: true }),
      },
    }).run();

    await prompted('Age?');
    screen.type('21');
    screen.keypress('enter');
    await expect(result).resolves.toEqual({ age: 42, done: true });
    expect(onAnswer).toHaveBeenCalledWith('age', 42, expect.anything());
  });

  it('pre-checks checkbox defaults and validates the selected values', async () => {
    const result = new CliGenie({
      ...interactive,
      steps: [
        checkbox({
          name: 'toppings',
          message: 'Toppings',
          choices: ['cheese', 'ham', 'olives'],
          default: ['ham'],
          validate: (values) => values.length < 3 || 'Too many',
        }),
      ],
    }).run();

    await prompted('Toppings');
    screen.keypress('space');
    screen.keypress('enter');
    await expect(result).resolves.toEqual({ toppings: ['cheese', 'ham'] });
  });

  it('skips steps that were answered up front', async () => {
    const result = new CliGenie({
      ...interactive,
      initialAnswers: { 'first-name': 'Ben' },
      steps: [
        text({ name: 'firstName', message: 'First name?' }),
        text({ name: 'city', message: 'City?' }),
      ],
    }).run();

    await prompted('City?');
    screen.type('Bath');
    screen.keypress('enter');
    await expect(result).resolves.toEqual({ firstName: 'Ben', city: 'Bath' });
  });

  it('rejects with GenieCancelledError and calls onCancel when aborted', async () => {
    const controller = new AbortController();
    const onCancel = vi.fn();
    const result = new CliGenie({
      ...interactive,
      context: { signal: controller.signal },
      hooks: { onCancel },
      steps: [text({ name: 'name', message: 'Name?' })],
    }).run();

    controller.abort();
    await expect(result).rejects.toBeInstanceOf(GenieCancelledError);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('rejects duplicate step names', () => {
    expect(
      () =>
        new CliGenie([text({ name: 'a', message: 'A' }), text({ name: 'a', message: 'A again' })]),
    ).toThrow('Duplicate step name "a"');
  });
});

describe('summary screen', () => {
  it('shows the answers and confirms', async () => {
    const result = new CliGenie({
      ...interactive,
      summary: { title: 'Review:' },
      steps: [text({ name: 'name', message: 'Name?' })],
    }).run();

    await prompted('Name?');
    screen.type('Ben');
    screen.keypress('enter');
    await prompted('Review:');
    await prompted('Name: Ben');
    screen.keypress('enter');

    await expect(result).resolves.toEqual({ name: 'Ben' });
  });

  it('lets the user change an answer and re-evaluates conditional steps', async () => {
    const result = new CliGenie({
      ...interactive,
      progress: false,
      summary: true,
      steps: [
        confirm({ name: 'pet', message: 'Got a pet?' }),
        text({ name: 'petName', message: 'Pet name?', when: (a) => a.pet }),
      ],
    }).run();

    await prompted('Got a pet?');
    screen.type('n');
    screen.keypress('enter');
    await prompted('Got a pet: No');

    screen.keypress('down'); // "Change an answer"
    screen.keypress('enter');
    await prompted('Which answer would you like to change?');
    screen.keypress('enter'); // pick "Got a pet"
    await prompted('Got a pet? (y/N)');
    screen.type('y');
    screen.keypress('enter');
    await prompted('Pet name?');
    screen.type('Rex');
    screen.keypress('enter');
    await prompted('Pet name: Rex');
    screen.keypress('enter');

    await expect(result).resolves.toEqual({ pet: true, petName: 'Rex' });
  });
});

describe('v1 compatibility', () => {
  it('accepts the v1 constructor and prompt helpers', async () => {
    const genie = new CliGenie(
      [
        textInputPrompt('Enter your name:', 'name'),
        listPrompt('Do you want to choose a color?', 'chooseColor', ['Yes', 'No']),
        listPrompt('Choose a color:', 'color', ['Red', 'Blue'], (a) => a.chooseColor === 'Yes'),
      ],
      { styling: {}, promptLibrary: {}, interactive: true },
    );
    const result = genie.run();

    await prompted('Enter your name:');
    screen.type('Ben');
    screen.keypress('enter');
    await prompted('Do you want to choose a color?');
    screen.keypress('enter');
    await prompted('Choose a color:');
    screen.keypress('enter');

    await expect(result).resolves.toEqual({ name: 'Ben', chooseColor: 'Yes', color: 'Red' });
  });
});
