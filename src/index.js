
const { notificationApp } = require("./internal/initialize");
const { teamsBot } = require("./teamsBot");
const express = require("express");
const botApiRoutes = require("./routes/bot");
const activityApiRoutes = require("./routes/activity");
const { Common } = require("./lib/common");

// Create express application.
const expressApp = express();
expressApp.use(express.json());

expressApp.use("/api/bot", botApiRoutes);
expressApp.use("/api/activity", activityApiRoutes);

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address());
});

const BotServiceUrl = process.env.BotServiceUrl || "";
console.log('BotServiceUrl', BotServiceUrl);
Common.__console('notificationApp', notificationApp);

// Microsoft 365 Agents SDK message handler.
expressApp.post("/api/messages", async (req, res) => {
  if (BotServiceUrl) {
    req.body.serviceUrl = BotServiceUrl;
  }
  Common.__console('req.headers', req.headers);
  Common.__console('req.body', req.body);
  await notificationApp.requestHandler(req, res, async (context) => {
    if (BotServiceUrl && context && context.activity) {
      context.activity.serviceUrl = BotServiceUrl;
    }
    const activity = context.activity;
    // 是 Adaptive Card 的交互事件
    if (activity.value && activity.value.action) {
      await Common.handleCardSubmit(context);
    } else {
      // let text = "呃... 🤔";
      // await context.sendActivity({ text: text, type: "message" });
    }
    await teamsBot.run(context);
  });
});

expressApp.get("/test", async (req, res) => {

  // /Users/md/workspace/java/customerIntegrate/teams/env/.env.prod
  //   /usr/local/teams/.env.local
  res.send("ok")
})

