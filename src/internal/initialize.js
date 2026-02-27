const { AgentBuilderCloudAdapter } = require("@microsoft/teamsfx");
const ConversationBot = AgentBuilderCloudAdapter.ConversationBot;

// 文件存储
// const { CustomFileStore } = require("../lib/CustomFileStore");
// const customStore = new CustomFileStore('./storage');


// MongoDB 存储
const { CustomMongoStore } = require("../lib/CustomMongoStore");
const mongoConnectionString = process.env.MONGODB_CONNECTION_STRING;
const customStore = new CustomMongoStore(mongoConnectionString);

// Create bot.
const notificationApp = new ConversationBot({
  // Single-tenant AAD app: must specify tenantId so MSAL authenticates against
  // the correct directory instead of the public 'Bot Framework' tenant.
  botAppId: process.env.BOT_ID,
  botAppPassword: process.env.BOT_PASSWORD,
  botAppTenantId: process.env.BOT_TENANT_ID,
  // Enable notification
  notification: {
    enabled: true,
    // 使用您的自定义 MongoDB 存储实例
    store: customStore,
  },
});

module.exports = {
  notificationApp
};
