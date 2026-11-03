// Run with: npm run build && node examples/project-setup.js
// Pre-fill answers: node examples/project-setup.js --name=my-app --template=api --no-git
// Scripted/CI:      GENIE_NAME=my-app GENIE_LICENSE=MIT node examples/project-setup.js --non-interactive </dev/null
import {
  CliGenie,
  Separator,
  checkbox,
  confirm,
  fromArgv,
  fromEnv,
  isCancelled,
  number,
  search,
  select,
  text,
} from 'cli-genie';

const LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
  'GPL-3.0-only',
  'ISC',
  'MPL-2.0',
  'Unlicense',
];

const genie = new CliGenie({
  title: '🧞 New project wizard',
  summary: { title: 'Ready to create your project:' },
  initialAnswers: { ...fromEnv('GENIE_'), ...fromArgv() },
  interactive: process.argv.includes('--non-interactive') ? false : 'auto',
  steps: [
    text({
      name: 'name',
      message: 'Project name',
      default: 'my-app',
      validate: (value) =>
        /^[a-z0-9-]+$/.test(value) || 'Use lowercase letters, numbers and dashes',
    }),
    select({
      name: 'template',
      message: 'Template',
      default: 'web',
      choices: [
        { name: 'Web app', value: 'web', description: 'Vite + TypeScript' },
        { name: 'API server', value: 'api', description: 'Node HTTP server' },
        new Separator(),
        { name: 'Library', value: 'lib' },
      ],
    }),
    number({
      name: 'port',
      message: 'Dev server port',
      default: 3000,
      min: 1024,
      max: 65535,
      when: (answers) => answers.template !== 'lib',
    }),
    checkbox({
      name: 'tooling',
      message: 'Extra tooling',
      choices: ['eslint', 'prettier', 'vitest', 'husky'],
      default: ['eslint', 'prettier'],
    }),
    search({
      name: 'license',
      message: 'License',
      source: (term) =>
        LICENSES.filter((l) => !term || l.toLowerCase().includes(term.toLowerCase())),
    }),
    confirm({ name: 'git', message: 'Initialise a git repository?', default: true }),
  ],
  hooks: {
    onComplete: (answers) => ({ ...answers, createdAt: new Date().toISOString() }),
  },
});

try {
  console.log(await genie.run());
} catch (error) {
  if (isCancelled(error)) {
    console.log('No wish today. Bye!');
    process.exitCode = 130;
  } else {
    console.error(error.message);
    process.exitCode = 1;
  }
}
