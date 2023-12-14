const inquirer = require('inquirer');

class CliGenie {
  constructor(prompts, options = {}) {
    this.prompts = prompts;
    this.answers = {};
    this.options = options;
  }

  async run() {
    try {
      for (const prompt of this.prompts) {
        const answer = await inquirer.prompt({
          ...prompt,
          ...this.options.styling, // Apply custom styling options
          ...(prompt.type === 'list' ? this.options.promptLibrary : {}), // Apply prompt library-specific options
        });
        this.answers = { ...this.answers, ...answer };
      }

      // Perform any final actions based on the collected answers
      console.log('Genie completed your wish. Answers:', this.answers);
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error) {
    // Log the error
    console.error('An error occurred during CliGenie execution:', error);

    // Perform any additional error handling logic here

    // Optionally, exit the process with a non-zero code to indicate failure
    process.exitCode = 1;
  }
}

module.exports = CliGenie;
