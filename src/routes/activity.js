const express = require("express");
const router = express.Router();
const request = require('request');
const { Common } = require("../lib/common");


const tenantId = process.env.MicrosoftTenantId;
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const teamsAppId = process.env.teamsAppId;

router.post("/notification", async (req, res) => {
  const { userIds, linkUrl, title, content, topic } = req.body;

  sendActivityToUsers(userIds, { linkUrl, title, content, topic }).then(result => {
    if (result.status >= 300) {
      console.log('sendActivityToUser:', result);
    }
  });

  return res.send({ data: userIds });
})


/**
 * 1) 发给个人
 */
async function sendActivityToUsers(userIds, { linkUrl, title, content, topic, activityType, templateParameters } = {}) {

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userId 数组不能为空');
  }

  const accessToken = await Common.getGraphToken(tenantId, clientId, clientSecret);
  const deepLink = Common.generateDeepLink(teamsAppId, linkUrl);
  const basePayload = buildActivityPayload({ topic, webUrl: deepLink, title, content, activityType, templateParameters });

  let url, payload;
  if (userIds.length === 1) {
    let userId = userIds[0];
    payload = {
      ...basePayload,
      recipient: {
        '@odata.type': 'microsoft.graph.aadUserNotificationRecipient',
        userId
      }
    };
    url = `https://graph.microsoft.com/v1.0/users/${userId}/teamwork/sendActivityNotification`;
  } else {
    payload = {
      ...basePayload,
      recipients: userIds.map(uid => ({
        '@odata.type': 'microsoft.graph.aadUserNotificationRecipient',
        userId: uid
      }))
    };
    url = 'https://graph.microsoft.com/v1.0/teamwork/sendActivityNotificationToRecipients';
  }
  return await postGraph(url, accessToken, payload);
}


/**
 * 通用：构造 Activity Notification payload
 */
function buildActivityPayload({ topic, webUrl, title, content, activityType = 'taskCreated', templateParameters = [] }) {
  const topicObj = { source: 'text', value: String(topic || '') };
  if (webUrl) topicObj.webUrl = webUrl;

  return {
    topic: topicObj,
    activityType,
    previewText: { content: String(content || '') },
    templateParameters: [
      { name: 'taskContent', value: String(title || '') },
      ...templateParameters
    ]
  };
}


/**
 * 通用：POST 到 Graph，直接返回 JSON
 */
function postGraph(url, accessToken, jsonBody) {
  return new Promise((resolve, reject) => {
    request(
      {
        url,
        json: true,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonBody,
      },
      (error, response, body) => {
        if (error) return reject(new Error(`请求失败: ${error.message}`));

        const status = response?.statusCode || 0;
        if (status >= 200 && status < 300) {
          resolve({
            status,
            location: response?.headers?.location || null,
            body: body
          });
        } else {
          console.log('body', JSON.stringify(body));
          reject(new Error(body?.error?.message || `HTTP ${status}`));
        }
      }
    );
  });
}





module.exports = router;