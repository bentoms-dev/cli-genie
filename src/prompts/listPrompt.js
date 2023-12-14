const listPrompt = (message, name, choices, when) => ({
    type: 'list',
    name,
    message,
    choices,
    when,
  });
  
  module.exports = listPrompt;
  