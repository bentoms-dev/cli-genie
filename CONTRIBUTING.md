# Contributing

Thanks for helping improve CLI Genie!

## Setup

```bash
git clone https://github.com/bentoms-dev/cli-genie.git
cd cli-genie
npm install
```

You'll need Node.js 22.13+ or 24+.

## Scripts

| Command                  | What it does                                          |
| ------------------------ | ----------------------------------------------------- |
| `npm test`               | Run the Vitest suite                                  |
| `npm run test:watch`     | Tests in watch mode                                   |
| `npm run typecheck`      | Type-check with `tsc`                                 |
| `npm run lint`           | ESLint                                                |
| `npm run format`         | Format with Prettier                                  |
| `npm run build`          | Build `dist/` (ESM, CJS, types and the CLI) with tsup |
| `npm run check`          | Everything CI runs                                    |
| `node examples/basic.js` | Try the library (after `npm run build`)               |

## Tests

Interactive behaviour is tested end to end with
[`@inquirer/testing`](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/testing).
Import `screen` from `@inquirer/testing/vitest` before anything that uses prompts. Then drive it
with `screen.type()` / `screen.keypress()` and use the `prompted(text)` helper in
`test/genie.test.ts` to wait for the next question.

## Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets):

1. Add a changeset to your PR with `npm run changeset`.
2. When it's merged, the Release workflow opens a "version packages" PR.
3. Merging that PR publishes to npm with provenance.

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm
token is stored in GitHub. The `cli-genie` package on npmjs.com trusts the `release.yml` workflow
in `bentoms-dev/cli-genie`, with "npm publish" allowed.
