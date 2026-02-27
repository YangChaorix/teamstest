# Teams 推送方式对比与实现指南

## 📋 目录
1. [方案对比](#方案对比)
2. [Power Automate 工作流实现审批推送](#power-automate-工作流实现审批推送)
3. [Microsoft Graph API 方式](#microsoft-graph-api-方式)
4. [Incoming Webhooks 方式](#incoming-webhooks-方式)
5. [Teams Bot 方式（当前项目使用）](#teams-bot-方式当前项目使用)

---

## 方案对比

| 方式 | 是否需要 Bot | 支持审批 | 推送个人 | 推送频道 | 复杂度 | **成本** | 适用场景 |
|------|------------|---------|---------|---------|--------|----------|----------|
| **Power Automate** | ❌ 否 | ✅ 是（内置） | ✅ 是 | ✅ 是 | ⭐ 低 | 💰 **高**（¥116/用户/月） | 审批流程、定时通知 |
| **Graph API - Activity** | ❌ 否 | ❌ 否（需自行实现） | ✅ 是 | ❌ 否 | ⭐⭐ 中 | ✅ **免费** | 个人通知 |
| **Graph API - Messages** | ❌ 否 | ❌ 否 | ✅ 是 | ✅ 是 | ⭐⭐⭐ 高 | ✅ **免费** | 频道/聊天消息 |
| **Incoming Webhooks** | ❌ 否 | ❌ **否**（无法交互） | ❌ 否 | ✅ 是 | ⭐ 低 | ✅ **免费** | 频道通知（不能审批） |
| **Teams Bot** | ✅ 是 | ✅ 是（需实现） | ✅ 是 | ✅ 是 | ⭐⭐⭐⭐ 高 | 💰 **低**（每月 10,000 条免费） | 复杂交互、自定义逻辑 |

---

## Power Automate 工作流实现审批推送

### 💰 收费情况

**Power Automate 是付费服务**，但提供以下选项：

#### 1. 免费试用
- ✅ **30 天免费试用**：可以体验所有功能
- 试用期结束后需要订阅付费计划

#### 2. 付费计划（按年付费）

| 计划 | 价格（人民币） | 适用场景 |
|------|--------------|---------|
| **Power Automate Premium** | 每用户每月 ¥116 | 有人参与的自动化流程（包括审批）|
| **Power Automate Process** | 每个机器人每月 ¥1,161 | 无人参与的自动化（RPA）|
| **Power Automate Hosted Process** | 每个机器人每月 ¥1,665 | 无人参与的自动化（云端托管）|

**注意**：
- 价格可能因地区和时间而有所变化
- 如果组织已有 Microsoft 365 商业订阅，可能包含部分 Power Automate 功能（但审批功能通常需要 Premium）
- 建议访问 [Power Automate 定价页面](https://www.microsoft.com/zh-cn/power-platform/products/power-automate/pricing) 获取最新定价

#### 3. 成本考虑

如果审批频率不高，可以考虑：
- **Teams Bot 方案**：虽然需要开发，但运行成本低（主要是服务器和 Azure Bot Service，通常有免费额度）
- **Graph API Activity**：完全免费，但只能通知，不能交互

### ✅ 优点
- **无需编写代码**：可视化流程设计
- **内置审批功能**：支持审批/拒绝、多级审批、并行审批
- **丰富的触发器**：HTTP 请求、SharePoint、表单提交、定时触发等
- **易于维护**：非技术人员也可以修改流程
- **无需部署 Bot**：不需要 Azure Bot Service 和 App Registration

### ❌ 缺点
- **需要付费**：每个审批用户需要 Premium 许可证（每月 ¥116）
- **成本较高**：如果审批人员较多，成本会显著增加

### 📝 实现步骤

#### 1. 创建 Power Automate 流程

1. 访问 [Power Automate](https://powerautomate.microsoft.com/)
2. 点击"创建" -> "自动化云端流程"
3. 选择触发器类型：
   - **HTTP 请求触发器**：接收来自外部系统的请求
   - **SharePoint 触发器**：当列表项创建/更新时触发
   - **定时触发器**：按计划执行

#### 2. 配置 HTTP 请求触发器（接收外部调用）

```json
{
  "title": "string",
  "content": "string",
  "approverEmail": "user@example.com",
  "linkUrl": "https://example.com/approval/123"
}
```

#### 3. 添加"Post message in a chat or channel"操作

- 选择要发送的团队和频道
- 配置消息内容
- 可以发送文本消息或 Adaptive Card

#### 4. 添加"Start and wait for an approval"操作 ⭐

这是**核心审批功能**：

```
操作名称：Start and wait for an approval
├─ 审批类型：
│  ├─ Approve/Reject - 简单的批准/拒绝
│  └─ Custom response - 自定义响应
├─ 分配给：可以使用动态内容（从触发器获取）
├─ 标题：审批标题
├─ 说明：审批详细内容
└─ 项目链接：链接到需要审批的项目
```

#### 5. 添加条件判断

```
如果审批结果是"批准"
├─ 执行批准后的操作（如更新系统状态）
└─ 发送确认消息
否则
├─ 执行拒绝后的操作
└─ 发送拒绝通知
```

### 🔧 示例流程

```
HTTP 请求 (触发)
  ↓
解析请求数据 (提取审批人、标题、内容等)
  ↓
发送 Teams 通知 (可选，先通知有审批待处理)
  ↓
开始并等待审批 ⭐
  ├─ 分配给：{{触发器中的 approverEmail }}
  ├─ 标题：{{触发器中的 title }}
  └─ 链接：{{触发器中的 linkUrl }}
  ↓
条件判断
  ├─ 如果审批 = 批准
  │  ├─ 调用 HTTP 请求 (POST 到你的系统API，更新审批状态)
  │  └─ 发送 Teams 消息 (审批通过通知)
  └─ 如果审批 = 拒绝
     ├─ 调用 HTTP 请求 (POST 到你的系统API，更新审批状态)
     └─ 发送 Teams 消息 (审批拒绝通知)
```

### 📞 从外部系统调用 Power Automate

```javascript
// 示例：从你的 Node.js 服务调用 Power Automate 流程
const axios = require('axios');

async function triggerApprovalFlow(data) {
  const flowUrl = process.env.POWER_AUTOMATE_FLOW_URL; // Power Automate 提供的 HTTP 触发器 URL
  
  const payload = {
    title: data.title,
    content: data.content,
    approverEmail: data.approverEmail,
    linkUrl: data.linkUrl,
    instanceId: data.instanceId,
    workId: data.workId
  };
  
  try {
    const response = await axios.post(flowUrl, payload);
    return response.data;
  } catch (error) {
    console.error('调用 Power Automate 失败:', error);
    throw error;
  }
}
```

### 🎯 审批结果回调

Power Automate 审批完成后，可以通过以下方式通知你的系统：

1. **HTTP 请求操作**：在条件分支中调用你的 API
2. **Azure Logic Apps**：如果需要更复杂的处理
3. **Power Automate 自定义连接器**：封装为可复用的连接器

---

## Microsoft Graph API 方式

### 方式 1: Activity Notification（项目中已实现）

**位置**：`src/routes/activity.js`

```javascript
// 已实现的 Activity Notification
POST /api/activity/notification
{
  "userIds": ["user@example.com"],
  "linkUrl": "https://example.com",
  "title": "审批待处理",
  "content": "您有一个待审批的申请",
  "topic": "审批提醒"
}
```

**优点**：
- ✅ 可以发送到个人用户的活动源
- ✅ 不需要 Bot 安装
- ✅ 用户点击后可以直接打开链接

**缺点**：
- ❌ 不支持审批交互（只能通知，需要跳转到外部系统处理）
- ❌ 不能发送到频道
- ❌ 不支持 Adaptive Card 交互按钮

### 方式 2: 直接发送消息到频道/聊天

使用 Graph API 的 `chatMessage` 端点：

```javascript
// 发送消息到频道
POST https://graph.microsoft.com/v1.0/teams/{team-id}/channels/{channel-id}/messages
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "body": {
    "contentType": "html",
    "content": "审批通知内容"
  }
}

// 发送 Adaptive Card 到频道
{
  "body": {
    "contentType": "html",
    "content": "审批通知"
  },
  "attachments": [
    {
      "id": "0",
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        // Adaptive Card JSON
      }
    }
  ]
}
```

**权限要求**：
- `ChannelMessage.Send`
- `ChatMessage.Send`（如果是私聊）

---

## Incoming Webhooks 方式

### ⚠️ 重要限制：不能完成审批交互

**Incoming Webhooks 不能直接完成审批**，因为：
- ❌ **单向通信**：只能发送消息到 Teams，无法接收用户的响应
- ❌ **无法处理交互**：即使用户点击 Adaptive Card 上的按钮，webhook 也无法接收到这个操作
- ❌ **按钮无效**：虽然可以发送带有"审批/拒绝"按钮的 Adaptive Card，但点击后无法处理响应

**适用场景**：
- ✅ 频道公告和通知
- ✅ 单向信息推送
- ✅ 需要跳转到外部系统处理的场景（通过链接）

### 配置步骤

1. **在 Teams 频道中添加 Webhook**
   - 打开 Teams 频道
   - 点击 "..." -> "Connectors"
   - 搜索 "Incoming Webhook"
   - 点击"配置"，设置名称和图标
   - 创建后会得到一个 Webhook URL（类似：`https://outlook.office.com/webhook/xxx@xxx/IncomingWebhook/xxx/xxx`）

2. **使用 Webhook URL 发送消息**

```javascript
// 使用项目中的 webhook 路由
POST /api/webhook/send
{
  "webhookUrl": "https://outlook.office.com/webhook/...",
  "title": "审批通知",
  "content": "您有一个待审批的申请",
  "linkUrl": "https://example.com/approval/123",  // 只能通过链接跳转到外部系统处理
  "themeColor": "0078D4"
}
```

**优点**：
- ✅ 配置简单，无需认证
- ✅ 可以发送到频道
- ✅ 支持 MessageCard 和 Adaptive Card（但按钮无法响应）

**缺点**：
- ❌ **不能完成审批交互**（核心限制）
- ❌ 只能发送到配置的频道，不能发送给个人用户
- ❌ 需要跳转到外部系统处理审批
- ❌ Webhook URL 泄露有安全风险

---

## Teams Bot 方式（当前项目使用）

### 💰 免费额度定义（明确说明）

**重要说明**：Teams Bot 的成本取决于你的部署方式。以下是详细定义：

#### 1. Azure Bot Service 资源费用

如果你在 Azure 中创建了 Bot Service 资源，有以下选项：

| 定价层 | 费用 | 消息限额 | 说明 |
|--------|------|---------|------|
| **F0（免费层）** | ✅ **免费** | 每月 **10,000 条消息** | 适合小型应用和测试 |
| **S1（标准层）** | 💰 付费（按消息数量） | 超出免费额度后付费 | 超出 10,000 条/月后按实际使用量收费($0.50/1,000 条消息) |

**关键定义**：
- ✅ **免费额度**：每月 10,000 条消息
- 📊 **消息计数**：Bot 发送给用户的消息（包括通知、响应等）
- ⚠️ **超出后**：按实际超出数量收费（具体价格需参考 Azure 官方定价）

**注意**：

- 这个免费额度是**每月重置**的
- 只计算 Bot **发送**的消息，不包括接收的消息
- 适用于 **标准通道**（Teams、Skype 等）的消息

#### 2. Teams 通道费用

| 通道类型 | 费用 | 说明 |
|---------|------|------|
| **标准通道** | ✅ **免费** | Teams、Skype、Cortana 等 Microsoft 自有服务 |
| **Premium 通道** | 💰 付费 | DirectLine、Web Chat 等自定义通道 |

**你的项目使用的是 Teams 通道**，所以这部分是**免费**的。

#### 3. 自托管服务器费用

**你的项目情况**（从 `docker-compose.yaml` 和部署方式来看）：
- Bot 代码运行在自己的服务器上（通过 Docker）
- 使用自己的基础设施（而非 Azure App Service）

**成本**：
- ✅ **如果使用自有服务器**：只需要服务器成本（电费、维护等，如果服务器已存在则没有额外费用）
- 💰 **如果使用 Azure App Service**：需要使用 Azure App Service 的费用（有免费层，但有限制）

#### 4. 其他相关费用

| 服务 | 费用 | 说明 |
|------|------|------|
| **Azure Active Directory（Bot 注册）** | ✅ **免费** | 用于 Bot 身份认证 |
| **Microsoft Teams 本身** | ✅ **免费** | Teams 客户端使用（需要合适的 Teams 许可证） |
| **数据库（MongoDB）** | 取决于部署方式 | 你的项目使用 MongoDB（可能是自托管或云服务） |

### 📊 实际成本估算（你的项目）

**假设**：每月发送 5,000 条审批通知

| 项目 | 费用 | 说明 |
|------|------|------|
| Azure Bot Service（F0 层） | ✅ **¥0** | 5,000 < 10,000（免费额度内） |
| Teams 通道 | ✅ **¥0** | 标准通道免费 |
| 自托管服务器 | 💰 **¥0-¥100** | 取决于服务器成本（如果已有服务器可能为 0） |
| MongoDB | 💰 **¥0-¥50** | 取决于部署方式（自托管可能为 0） |
| **总计** | 💰 **¥0-¥150/月** | 大部分情况下接近免费 |

**如果超出免费额度**（例如每月 20,000 条消息）：

| 项目 | 费用 | 说明 |
|------|------|------|
| Azure Bot Service（F0 层） | 💰 **¥X** | 超出 10,000 条的部分按实际使用量收费 |
| 其他同上 | - | - |

⚠️ **注意**：超出免费额度后的具体定价需要参考 [Azure Bot Service 定价页面](https://azure.microsoft.com/zh-cn/pricing/details/bot-services/)，价格可能因地区和版本而异。

### ✅ 免费额度的明确条件

要享受免费额度，需要满足以下条件：

1. ✅ 使用 **F0（免费层）** 的 Azure Bot Service 资源
2. ✅ 使用 **标准通道**（Teams、Skype 等）
3. ✅ 每月消息数量 **≤ 10,000 条**
4. ✅ Bot 代码自托管或使用有免费层的云服务

**不满足免费额度的场景**：
- ❌ 使用 Premium 通道（DirectLine、Web Chat 等）
- ❌ 需要高级 Bot 功能（某些 AI 功能可能需要付费）
- ❌ 使用 Azure App Service 托管且超出免费层限制

### 当前实现

**位置**：`src/routes/bot.js`

- 使用 `@microsoft/agents-hosting` 发送 Adaptive Card
- 支持推送个人用户
- 支持 Adaptive Card 交互（审批/拒绝按钮）
- 需要用户安装 Bot
- **部署方式**：自托管（Docker）

### 与其他方式的对比

| 特性 | Bot 方式 | Power Automate | Graph API Activity |
|------|---------|---------------|-------------------|
| 用户需要安装 | ✅ 是 | ❌ 否 | ❌ 否 |
| 支持审批交互 | ✅ 是 | ✅ 是（内置） | ❌ 否 |
| 推送个人用户 | ✅ 是 | ✅ 是 | ✅ 是 |
| 推送频道 | ✅ 是 | ✅ 是 | ❌ 否 |
| 开发复杂度 | ⭐⭐⭐⭐ 高 | ⭐ 低 | ⭐⭐ 中 |
| **运行成本** | ⭐⭐ **低**（每月 10,000 条消息免费） | ⭐⭐⭐⭐ **高**（¥116/用户/月） | ⭐ **免费** |
| 维护成本 | ⭐⭐⭐ 中 | ⭐ 低 | ⭐⭐ 中 |

---

## 💡 推荐方案

### 场景 1: 简单的审批流程（预算充足）
**推荐：Power Automate**
- 无需编写代码
- 内置审批功能
- 易于维护和修改
- ⚠️ **注意**：需要每用户每月 ¥116 的 Premium 许可证

### 场景 2: 需要复杂业务逻辑的审批（预算有限）
**推荐：Teams Bot + Adaptive Card**
- 可以完全自定义审批流程
- 支持复杂的数据处理
- 可以集成到现有系统
- ✅ **成本低**：Azure Bot Service F0 层每月 10,000 条消息免费 + 自托管服务器成本（通常很低）

### 场景 3: 仅需通知，不需要交互
**推荐：Graph API Activity Notification**（项目已实现）
- 轻量级
- 用户体验好（出现在活动源）
- 不需要 Bot 安装

### 场景 4: 频道公告（不需要交互）
**推荐：Incoming Webhooks**
- 配置简单
- 适合固定频道的通知
- ⚠️ **注意**：不能用于需要用户交互的审批场景

---

## 🔗 相关资源

- [Power Automate 官方文档](https://docs.microsoft.com/zh-cn/power-automate/)
- [Teams 审批功能](https://docs.microsoft.com/zh-cn/power-automate/create-approval-workflows)
- [Microsoft Graph API - Teams](https://docs.microsoft.com/zh-cn/graph/api/resources/teams-api-overview)
- [Teams Incoming Webhooks](https://docs.microsoft.com/zh-cn/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [Azure Bot Service 定价](https://azure.microsoft.com/zh-cn/pricing/details/bot-services/)
- [Azure Bot Service 免费层说明](https://learn.microsoft.com/zh-cn/azure/bot-service/bot-service-manage-channels)
