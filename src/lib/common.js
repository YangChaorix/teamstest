const crypto = require('crypto');
const _ = require('lodash');
const request = require('request');
const JWT = require('jsonwebtoken');
const ACData = require("adaptivecards-templating");
const notificationTaskResultTemplate = require("../adaptiveCards/notification-task-result.json"); // 导入新模板
const { Activity } = require('@microsoft/agents-activity'); // 确保你已经正确导入 Activity 类
const ServerUrl = process.env.HAPServerUrl;
const AppKey = process.env.HAPAppKey;
const SecretKey = process.env.HAPSecretKey;

const _graphTokenCache = {
    accessToken: null,
    expiresAt: 0,
    inFlight: null,
};

const CLOCK_SKEW_SEC = 60;


let Common = {
    //     {
    //     "batchOperationType": 0,
    //     "selects": [
    //     {
    //     "id": "string",
    //     "workId": "string"
    //     }
    //     ]
    // }

    handleCardSubmit: async function (context, res) {
        let { action, instanceId, workId, accountId, title, content, source } = context.activity.value;
        let templateData = {
            title: title,
            content: content,
            source: source
        };
        let selects = [
            {
                id: instanceId,
                workId: workId,
            }
        ];
        const replyToId = context.activity.replyToId; // 原始卡片的 ID
        if (action === "approve" || action === "reject") {
            let operationType = action === "approve" ? 4 : 5;
            let msgText = action === "approve" ? "审批已通过" : "审批已拒绝";
            this.handleApprove(accountId, selects, operationType).then(resp => {
                this.__console('handleCardSubmit resp', resp);
                if (resp.success != true) {
                    console.log('handleApprove', result);
                }
            });
            templateData.msgText = msgText;
            // 步骤 1: 准备更新后的卡片数据
            const template = new ACData.Template(notificationTaskResultTemplate);
            const cardContent = template.expand({
                $root: templateData
            });
            // 步骤 2: 使用 Activity.fromObject() 创建一个正确的 Activity 实例
            const updatedActivity = Activity.fromObject({
                type: "message",
                id: replyToId, // 使用原始卡片的ID来标识要更新的活动
                attachments: [{
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: cardContent
                }],
            });
            // 步骤 3: 调用 context.updateActivity 更新卡片
            try {
                // 现在传入的是一个正确的 Activity 实例，它有 applyConversationReference 方法
                await context.updateActivity(updatedActivity);
            } catch (updateError) {
                console.error('Failed to update activity:', updateError);
                // 如果更新失败，可以发送一个新的消息作为后备方案
                await context.sendActivity({ text: msgText, type: "message" });
            }
            return;
        } else {
            return await context.sendActivity({ text: "未识别的操作类型", type: "message" });
        }
    },

    /**
     * 处理审批/拒绝请求
     * @param {string} accountId 
     * @param {string} appKey 
     * @param {number} operationType 操作类型 (4=通过, 5=拒绝)
     * selects = [{
                id: instanceId,
                workId: workId,
            }]
     */
    handleApprove: async function (accountId, selects, operationType) {
        let timestamp = new Date().getTime();
        let sign = this.getSignature(AppKey, SecretKey, timestamp);
        const queryParams = new URLSearchParams({
            accountId,
            appKey: AppKey,
            timestamp,
            sign
        }).toString();

        const apiUrl = `${ServerUrl}/api/workflow/v1/instance/batch?${queryParams}`;
        const payload = {
            batchOperationType: operationType,
            selects,
        };
        return new Promise((resolve) => {
            request.post({
                url: apiUrl,
                json: true,
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            }, (error, response, body) => {
                if (error) {
                    console.error('审批API调用失败:', { url: apiUrl, queryParams, payload, error: error.message });
                    return resolve({ success: false, message: error.message });
                }
                // console.log('response', JSON.stringify(response));
                if (response.statusCode !== 200) {
                    console.log('审批API HTTP错误:', JSON.stringify(response));
                    return resolve({ success: false, message: `HTTP错误 ${response.statusCode}` });
                }
                if (body.status !== 1) {
                    console.log('审批API HTTP错误:', JSON.stringify(body));
                    return resolve({
                        success: false,
                        code: body.code,
                        message: body.msg || body.exception || '未知错误',
                    });
                }
                return resolve({ success: true, data: body.data === true });
            });
        });
    },

    getInstanceDetail: async function (accountId, instanceId, workId) {
        let timestamp = new Date().getTime();
        let sign = this.getSignature(AppKey, SecretKey, timestamp);
        const queryParams = new URLSearchParams({
            accountId,
            id: instanceId, // API参数是id
            workId,
            appKey: AppKey,
            timestamp,
            sign
        }).toString();


        const apiUrl = `${ServerUrl}/api/workflow/v1/instance/get?${queryParams}`;

        return new Promise((resolve) => {
            request.get({
                url: apiUrl,
                json: true,
                headers: { 'Content-Type': 'application/json' },
            }, (error, response, body) => {
                this.__console('getInstanceDetail body', body);
                if (error) {
                    console.error('获取流程实例详情API调用失败:', { url: apiUrl, queryParams, error: error.message });
                    return resolve({ success: false, message: error.message });
                }

                if (response.statusCode !== 200) {
                    console.log('获取流程实例详情API HTTP错误:', JSON.stringify(response));
                    return resolve({ success: false, message: `HTTP错误 ${response.statusCode}` });
                }

                if (body.status !== 1) {
                    console.log('获取流程实例详情API HTTP错误:', JSON.stringify(body));
                    return resolve({
                        success: false,
                        code: body.code,
                        message: body.msg || body.exception || '未知错误',
                    });
                }
                // 成功返回整个 body 数据，以便处理详情
                return resolve({ success: true, data: body });
            });
        });
    },


    getSignature: function (appKey, secretKey, timestamp) {
        // 按字典顺序拼接参数字符串
        const params = {
            AppKey: appKey,
            SecretKey: secretKey,
            Timestamp: timestamp.toString()
        };
        const signStr = _(params)
            .keys()
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        // SHA256 并生成 Hex 格式
        const hashHex = crypto.createHash('sha256')
            .update(signStr, 'utf8')
            .digest('hex')
            .toLowerCase();

        // 转成 Base64
        return Buffer.from(hashHex, 'utf8').toString('base64');
    },

    // 获取 Graph API 访问令牌
    getGraphToken: async function (tenantId, clientId, clientSecret) {
        const now = Date.now();

        // console.log('，_graphTokenCache ', _graphTokenCache);

        // 1) 命中缓存
        if (_graphTokenCache.accessToken && now < _graphTokenCache.expiresAt) {
            return _graphTokenCache.accessToken;
        }

        // 2) 已在刷新中，复用同一 Promise，避免惊群
        if (_graphTokenCache.inFlight) {
            return _graphTokenCache.inFlight;
        }

        // 3) 触发一次新的刷新
        _graphTokenCache.inFlight = new Promise((resolve, reject) => {
            const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
            const form = {
                client_id: clientId,
                scope: 'https://graph.microsoft.com/.default',
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            };

            request.post({
                url,
                form,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                json: true // 自动解析 JSON 响应
            }, (error, response, body) => {
                // 无论成功失败都清掉 inFlight
                const clearInFlight = () => { _graphTokenCache.inFlight = null; };

                if (error) {
                    clearInFlight();
                    console.error('请求失败:', error);
                    return reject(new Error('请求失败: ' + error.message));
                }

                if (response.statusCode !== 200) {
                    clearInFlight();
                    console.error('响应错误:', body);
                    return reject(new Error('获取访问令牌失败: ' + (body?.error_description || '未知错误')));
                }

                const token = body.access_token;
                const expiresInSec = Number(body.expires_in || 3600);

                // 动态缓冲：最多 60s，也可按需调整
                const skew = Math.min(CLOCK_SKEW_SEC, Math.max(0, Math.floor(expiresInSec / 10)));
                const expiresAt = Date.now() + (expiresInSec - skew) * 1000;

                try {
                    const decoded = JWT.decode(token);
                    if (!decoded?.roles || !decoded.roles.includes('TeamsActivity.Send')) {
                        clearInFlight();
                        return reject(new Error('获取的令牌不包含 TeamsActivity.Send 权限'));
                    }
                } catch (e) {
                    // 非致命：decode 失败通常不影响使用，按需改为严格校验
                }

                // 写入缓存
                _graphTokenCache.accessToken = token;
                _graphTokenCache.expiresAt = expiresAt;

                clearInFlight();
                resolve(token);
            }
            );
        });
        return _graphTokenCache.inFlight;
    },

    /**
     * 生成 Teams 深度链接
     * @param {string} teamsAppId - Teams 应用 ID
     * @param {string} [teamsEntityId] - 可选 entityId（对应 manifest 中的 entityId）
     * @param {string} returnUrl - 用户点击后跳转的返回地址
     * @returns {string} 深度链接
     *
     * 链接格式（含 context 参数）：
     * https://teams.microsoft.com/l/entity/<appId>[/<entityId>]?context=...
     */
    generateDeepLink: function (teamsAppId, returnUrl, teamsEntityId) {
        const params = {
            returnUrl,
            _ts: Date.now().toString(),
        };

        const contextObj = {
            subEntityId: JSON.stringify(params),
        };

        const encodedContext = encodeURIComponent(JSON.stringify(contextObj));

        // 构建 base 链接
        let link = `https://teams.microsoft.com/l/entity/${encodeURIComponent(teamsAppId)}`;
        if (teamsEntityId) {
            link += `/${encodeURIComponent(teamsEntityId)}`;
        }
        link += `?context=${encodedContext}`;
        return link;
    },

    __console: function (name, log) {
        if (process.env.DEBUG) {
            console.log(`${name}::`)
            if (typeof log == 'object') {
                console.log(JSON.stringify(log))
            } else {
                console.log(log);
            }
        }
    }
}

exports.Common = Common;