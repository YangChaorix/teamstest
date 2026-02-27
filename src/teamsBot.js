const { AgentApplication } = require("@microsoft/agents-hosting");

const teamsBot = new AgentApplication();

teamsBot.conversationUpdate("membersAdded", async (context) => {
  await context.sendActivity(
    "hello!"
  );
});

module.exports.teamsBot = teamsBot;
