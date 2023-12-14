const { CliGenie } = require('./src/utils/cliGenie');
const textInputPrompt = require('./src/prompts/textInputPrompt');
const listPrompt = require('./src/prompts/listPrompt');

const stylingOptions = {
  // Add custom styling options here
};

const promptLibraryOptions = {
  // Add options specific to the chosen prompt library (e.g., inquirer, enquirer, etc.)
};

const genie = new CliGenie(
  [
    textInputPrompt('Enter your name:', 'name'),
    listPrompt('Do you want to choose a color?', 'chooseColor', ['Yes', 'No']),
    listPrompt('Choose a color:', 'color', ['Red', 'Green', 'Blue', 'Yellow', 'Purple'], (answers) => answers.chooseColor === 'Yes'),
    // Add more prompts as needed
  ],
  {
    styling: stylingOptions,
    promptLibrary: promptLibraryOptions,
  }
);

genie.run();
