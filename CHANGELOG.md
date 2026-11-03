# Changelog

## 2.0.0

A ground-up rewrite in TypeScript. v1 code keeps working through compatibility helpers.
See "Migrating from v1" in the README for the breaking changes.

### Fixed

- The package now actually ships `CliGenie`. In 1.0.x, `.npmignore` excluded `src/utils`
  and `main` pointed at the example script.
- `require('cli-genie').CliGenie` now works (it was `undefined`).
- Works with the ESM-only Inquirer releases. 1.0.x crashed on `require('inquirer')`.
- `when` / `validate` / `default` functions now receive earlier answers, so conditional
  questions work.

### Added

- ESM + CommonJS builds with TypeScript type definitions.
- Step builders: `text`, `password`, `number`, `confirm`, `select`, `rawlist`, `checkbox`,
  `expand`, `search`, `editor`. Messages, defaults and choices can be computed from earlier answers.
- Review screen (`summary`) with "change an answer" and "start over".
- Progress counter, `title` banner, genie theme (`theme: 'genie' | 'plain' | object`).
- Non-interactive mode with `initialAnswers`, `fromArgv()`, `fromEnv()`, type coercion and validation.
- Hooks: `transform`, `onAnswer`, `onComplete`, `onCancel`.
- `GenieCancelledError`, `MissingAnswerError`, `InvalidAnswerError`, `isCancelled()`.
- JSON wizard definitions (`defineWizard`, `loadWizard`) and the `cli-genie` command.
- Tests, linting, CI on Node 22/24/26, Dependabot and Changesets-based releases with npm provenance.

### Changed

- `run()` resolves with the answers instead of logging them, and throws instead of setting `process.exitCode`.
- Requires Node.js 22.13+.
- Uses `@inquirer/prompts` instead of `inquirer`.

## 1.0.1

- Initial public release.
