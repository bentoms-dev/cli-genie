const textInputPrompt = (message, name, validate, defaultValue) => ({
    type: 'input',
    name,
    message,
    validate,
    default: defaultValue,
  });
  
  module.exports = textInputPrompt;
  