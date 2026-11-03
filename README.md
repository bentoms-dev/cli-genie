![CLI Genie logo](https://i.ibb.co/pbdjT80/cli-genie.png)

# CLI Genie

[![npm](https://img.shields.io/npm/v/cli-genie)](https://www.npmjs.com/package/cli-genie)
[![CI](https://github.com/bentoms-dev/cli-genie/actions/workflows/ci.yml/badge.svg)](https://github.com/bentoms-dev/cli-genie/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/cli-genie)](./LICENSE)

Build guided, genie-style command-line wizards in a few lines. CLI Genie wraps
[Inquirer](https://github.com/SBoudrias/Inquirer.js) with what most wizards need:

- 🧞 **10 prompt types**: text, password, number, confirm, select, rawlist, checkbox, expand, search, editor
- 🔀 **Conditional and dynamic steps**: `when`, `message`, `default` and `choices` can depend on earlier answers
- 📋 **Review screen** where users can check and change any answer before finishing
- 🤖 **Non-interactive mode** for CI and scripts: answers from flags, env vars or code, with type coercion and validation
- 🪝 **Hooks**: `transform`, `onAnswer`, `onComplete`, `onCancel`
- 📄 **JSON wizards** and a `cli-genie` command, so no code is needed
- 🎨 Genie theme, progress counter, clean Ctrl+C handling
- 🟦 Written in TypeScript, ships ESM + CommonJS with type definitions

Requires Node.js 22.13+ or 24+.

## Installation

```bash
npm install cli-genie
```

## Quick start

```js
import { CliGenie, confirm, select, text } from 'cli-genie';
// or: const { CliGenie, confirm, select, text } = require('cli-genie');

const genie = new CliGenie({
  title: 'Welcome to CLI Genie',
  summary: true,
  steps: [
    text({ name: 'name', message: 'What is your name?', required: true }),
    confirm({ name: 'chooseColor', message: 'Do you want to choose a colour?' }),
    select({
      name: 'color',
      message: (answers) => `Pick a colour, ${answers.name}:`,
      choices: ['Red', 'Green', 'Blue'],
      when: (answers) => answers.chooseColor,
    }),
  ],
});

const answers = await genie.run();
// { name: 'Ben', chooseColor: true, color: 'Green' }
```

There are more examples in [`examples/`](./examples).

## Steps

Each step builder takes the matching [Inquirer prompt options](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/prompts#prompts)
plus these CLI Genie options:

| Option      | Type                                 | Description                                                  |
| ----------- | ------------------------------------ | ------------------------------------------------------------ |
| `name`      | `string`                             | **Required.** Key the answer is stored under.                |
| `message`   | `string \| (answers) => string`      | **Required.** The question.                                  |
| `default`   | `value \| (answers) => value`        | Default answer (also used in non-interactive mode).          |
| `when`      | `(answers) => boolean`               | Only ask when this returns `true`.                           |
| `validate`  | `(value, answers) => true \| string` | Return `true` or an error message. Receives earlier answers. |
| `transform` | `(value, answers) => any`            | Change the answer before it is stored.                       |
| `label`     | `string`                             | Label for the review screen (defaults to the message).       |
| `theme`     | `object`                             | Per-step Inquirer theme overrides.                           |

| Builder      | Answer type | Notes                                                                    |
| ------------ | ----------- | ------------------------------------------------------------------------ |
| `text()`     | `string`    | `required: true` rejects empty input.                                    |
| `password()` | `string`    | `mask: true` shows `*` characters.                                       |
| `number()`   | `number`    | `min`, `max`, `step`.                                                    |
| `confirm()`  | `boolean`   |                                                                          |
| `select()`   | choice      | `choices` may be a function of the answers. Supports `Separator`.        |
| `rawlist()`  | choice      | Numbered list.                                                           |
| `checkbox()` | `array`     | `default` is the list of pre-checked values. `validate` gets the values. |
| `expand()`   | choice      | Choices have a `key`; `default` is a key.                                |
| `search()`   | choice      | `source(term, { signal, answers })` returns choices.                     |
| `editor()`   | `string`    | Opens `$EDITOR`.                                                         |

## Options

```ts
new CliGenie({
  steps, // Step[]
  title, // banner shown before the first question
  progress: true, // show "(2/5)" before each question
  summary: false, // true | { title?, allowEdit?, format?(value, step) }
  theme: 'genie', // 'genie' | 'plain' | custom Inquirer theme object
  initialAnswers: {}, // pre-filled answers; matching steps are skipped
  interactive: 'auto', // true | false | 'auto' (prompt only when stdin is a TTY)
  hooks: { onAnswer, onComplete, onCancel },
  context: { input, output, signal }, // passed to every prompt
});
```

### Review screen

With `summary: true`, the genie lists every answer at the end. The user can confirm,
**change any answer** or start over. When an answer changes, steps that depend on it
are asked or removed automatically.

### Non-interactive mode and pre-filled answers

```js
import { CliGenie, fromArgv, fromEnv } from 'cli-genie';

const genie = new CliGenie({
  steps,
  // `--first-name=Ben`, `--no-git`, `GENIE_FIRST_NAME=Ben` all match a step named `firstName`
  initialAnswers: { ...fromEnv('GENIE_'), ...fromArgv() },
});
```

Supplied answers are converted to the step's type (`"42"` → `42`, `"yes"` → `true`,
`"a,b"` → `['a', 'b']`, and a choice's name or value → its value) and then validated.
When there's no TTY (CI, piped input) or `interactive: false` is set, any step without
a supplied answer uses its `default`. If it has no default, a `MissingAnswerError` is thrown.

### Cancelling

Pressing Ctrl+C (or aborting `context.signal`) rejects `run()` with a `GenieCancelledError`
that contains the answers collected so far:

```js
import { isCancelled } from 'cli-genie';

try {
  await genie.run();
} catch (error) {
  if (isCancelled(error)) process.exit(130);
  throw error;
}
```

Other errors: `MissingAnswerError` and `InvalidAnswerError`, both subclasses of `GenieError`.

### TypeScript

```ts
interface Order {
  size: 'small' | 'large';
  extras: string[];
}
const order = await genie.run<Order>();
```

## JSON wizards and the `cli-genie` command

Define a wizard as JSON. Functions are replaced by declarative options:

```json
{
  "title": "Pizza order",
  "summary": true,
  "steps": [
    {
      "type": "text",
      "name": "email",
      "message": "Email",
      "pattern": "@",
      "patternMessage": "Invalid email"
    },
    { "type": "select", "name": "size", "message": "Size", "choices": ["small", "large"] },
    { "type": "confirm", "name": "delivery", "message": "Delivery?" },
    { "type": "text", "name": "address", "message": "Address", "when": { "delivery": true } }
  ]
}
```

`when` matches when every listed answer is equal; an array value means "any of".
`search` steps aren't available in JSON because they need a function.

Run it from code with `await loadWizard('wizard.json')` or `defineWizard(object)`, or from the shell:

```bash
npx cli-genie wizard.json                       # prompts on stderr, answers as JSON on stdout
npx cli-genie wizard.json --size=large          # pre-fill answers
npx cli-genie wizard.json --non-interactive     # never prompt (CI)
ORDER=$(npx cli-genie wizard.json)              # capture the answers
```

## Migrating from v1

v1 code still works, with deprecation warnings in your editor:

```js
const { CliGenie, textInputPrompt, listPrompt } = require('cli-genie');
new CliGenie([textInputPrompt('Name?', 'name'), listPrompt('Colour?', 'color', ['Red'])]).run();
```

Breaking changes in 2.0:

- Node.js 22.13+ is required.
- `run()` **resolves with the answers** and no longer prints them.
- Errors are **thrown** (as `GenieError` subclasses) instead of being logged with `process.exitCode = 1`.
- `when` now receives the earlier answers. In v1 it always received `{}`, so conditional questions never appeared.
- `styling` is merged into the Inquirer theme. `promptLibrary` is ignored.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT, see [LICENSE](./LICENSE).
