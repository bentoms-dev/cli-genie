![CLI Genie logo](https://i.ibb.co/pbdjT80/cli-genie.png)

# Cli Genie

Cli Genie is an NPM package that allows developers to easily create interactive command-line interfaces (CLIs) with a genie-style interface. It simplifies the process of building complex command-line tools by providing a guided user experience.

## Installation

```bash
npm install cli-genie
```

# Usage

```bash
const { CliGenie } = require('cli-genie');
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
    listPrompt('Choose a color:', 'color', ['Red', 'Green', 'Blue'], (answers) => answers.chooseColor === 'Yes'),
    // Add more prompts as needed
  ],
  {
    styling: stylingOptions,
    promptLibrary: promptLibraryOptions,
  }
);

genie.run();
```

# Customization Options

* Styling Options: Developers can customize the look and feel of the genie by providing styling options.

* Prompt Library Options: Developers can choose different prompt libraries and provide library-specific options.

# Error Handling

The CliGenie package includes error handling to gracefully handle unexpected situations during execution.

# License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/bentoms-dev/cli-genie/blob/main/LICENSE) file for details.

