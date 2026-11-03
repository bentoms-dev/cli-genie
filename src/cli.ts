import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadWizard } from './definition.js';
import { GenieError, isCancelled } from './errors.js';
import { fromArgv, fromEnv } from './sources.js';

const HELP = `Usage: cli-genie <wizard.json> [--<step-name>=<value> ...] [options]

Runs a JSON-defined wizard and prints the answers as JSON to stdout.
Prompts are drawn on stderr, so stdout can be piped or captured.

Answers can be pre-filled with --<step-name>=<value> flags or GENIE_<STEP_NAME>
environment variables; matching questions are skipped.

Options:
  --non-interactive  Never prompt; use supplied answers and defaults only
  -h, --help         Show this help
  -v, --version      Show the version
`;

function version(): string {
  for (const rel of ['../package.json', '../../package.json']) {
    try {
      const pkg = JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
      if (pkg.name === 'cli-genie') return pkg.version as string;
    } catch {
      // try next location
    }
  }
  return 'unknown';
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  if (argv.includes('-h') || argv.includes('--help')) {
    process.stdout.write(HELP);
    return 0;
  }
  if (argv.includes('-v') || argv.includes('--version')) {
    process.stdout.write(`${version()}\n`);
    return 0;
  }

  const nonInteractive = argv.includes('--non-interactive');
  const args = argv.filter((arg) => arg !== '--non-interactive');
  // The wizard path is the first positional that isn't the value of a preceding `--name` flag.
  const fileIndex = args.findIndex(
    (arg, i) => !arg.startsWith('-') && !/^--[^=]+$/.test(args[i - 1] ?? ''),
  );
  if (fileIndex === -1) {
    process.stderr.write(HELP);
    return 1;
  }
  const file = args[fileIndex]!;
  const answerArgs = args.filter((_, i) => i !== fileIndex);

  try {
    const genie = await loadWizard(file, {
      initialAnswers: { ...fromEnv(), ...fromArgv(answerArgs) },
      interactive: nonInteractive ? false : 'auto',
      context: { output: process.stderr },
    });
    const answers = await genie.run();
    process.stdout.write(`${JSON.stringify(answers, null, 2)}\n`);
    return 0;
  } catch (error) {
    if (isCancelled(error)) {
      process.stderr.write('\nWish cancelled.\n');
      return 130;
    }
    if (error instanceof GenieError) {
      process.stderr.write(`cli-genie: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}
