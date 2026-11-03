// Run with: npm run build && node examples/basic.js
import { CliGenie, confirm, select, text } from 'cli-genie';

const genie = new CliGenie({
  title: 'Welcome to CLI Genie',
  summary: true,
  steps: [
    text({ name: 'name', message: 'What is your name?', required: true }),
    confirm({ name: 'chooseColor', message: 'Do you want to choose a colour?' }),
    select({
      name: 'color',
      message: (answers) => `Pick a colour, ${answers.name}:`,
      choices: ['Red', 'Green', 'Blue', 'Yellow', 'Purple'],
      when: (answers) => answers.chooseColor,
    }),
  ],
});

const answers = await genie.run();
console.log('Your wish is granted:', answers);
