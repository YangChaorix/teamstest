const express = require("express");
const router = express.Router();
const { notificationApp } = require("../internal/initialize");
const ACData = require("adaptivecards-templating");
const dayjs = require('dayjs');
const notificationTaskTemplate = require("../adaptiveCards/notification-task.json"); // 审批通知
const notificationTemplate = require("../adaptiveCards/notification.json"); // 通用通知
const { Common } = require("../lib/common");


// 推送个人
router.post("/notification", async (req, res) => {
    // 从请求体中解构出所需数据
    const { users, messageType, title, content, source, instanceId, workId } = req.body;

    // 筛选出所有unionId，用于构建筛选条件
    const unionIds = users.map(user => user.unionId);

    // 检查users数组是否为空
    if (!users || users.length === 0 || unionIds.length == 0) {
        return res.status(400).json({ 'msg': "users array is required" });
    }

    let msgTemplate = messageType == "TODO" ? notificationTaskTemplate : notificationTemplate;
    let notifyData = {
        instanceId: instanceId,
        workId: workId,
        title: title,
        content: content,
        source: source
    };
    notifyData.timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');

    let sentIds = [];
    let failedIds = [];

    const pageSize = 20;
    let offset = 0;
    let continuationToken = JSON.stringify({
        offset: offset,
        filters: {
            aadObjectId: {
                $in: unionIds
            }
        }
    });
    do {
        const pagedData = await notificationApp.notification.getPagedInstallations(
            pageSize,
            continuationToken
        );

        const installations = pagedData.data;
        continuationToken = pagedData.continuationToken;

        Common.__console('installations', installations);

        const sendPromises = installations.map(target => {
            Common.__console('target', target);
            const unionId = target.conversationReference?.user?.aadObjectId;
            const userInRequest = users.find(user => user.unionId === unionId);

            if (!unionId || !userInRequest) {
                return Promise.resolve(); // 跳过无效目标
            }
            // 无论发送成功或失败，都将 unionId 推送到 sentIds，因为这是被尝试发送的对象
            sentIds.push(unionId);
            // 将当前用户的 accountId 赋给 notifyData
            notifyData.accountId = userInRequest.accountId;
            // console.log(`Sending notification to user with unionId: ${unionId}, accountId: ${userInRequest.accountId}`);

            // 异步发送通知，并使用 then/catch 捕获单个异常
            return target.sendAdaptiveCard(
                new ACData.Template(msgTemplate).expand({
                    $root: notifyData,
                })
            ).then((sres) => {
                console.log(`Successfully send ${unionId}:`, sres);
            }).catch(error => {
                console.error(`Failed send to ${unionId}:`, error);
                // 这里我们不再收集失败的ID，而是只在日志中记录
            });
        });

        // 异步执行所有发送任务，不等待结果，让它们在后台继续运行
        Promise.allSettled(sendPromises);

    } while (continuationToken);

    res.json({
        code: 0,
        data: sentIds
    });
});

// 推送所有
router.post("/notification/all", async (req, res) => {
    const { title, content, source, instanceId, workId } = req.body;
    let msgTemplate = notificationTemplate;
    let notifyData = {
        instanceId: instanceId,
        workId: workId,
        title: title,
        content: content,
        source: source
    };
    notifyData.timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');;

    const pageSize = 100;
    let continuationToken = JSON.stringify({ offset: 0 });
    let sentIds = [];
    do {
        const pagedData = await notificationApp.notification.getPagedInstallations(
            pageSize,
            continuationToken
        );
        const installations = pagedData.data;
        continuationToken = pagedData.continuationToken;

        console.log('installations', installations.length);

        // 创建一个Promise数组，每个Promise代表一个异步发送任务
        const sendPromises = installations.map(target => {
            const unionId = target.conversationReference?.user?.aadObjectId;
            if (!unionId) {
                return Promise.resolve();
            }
            sentIds.push(unionId);
            return target.sendAdaptiveCard(
                new ACData.Template(msgTemplate).expand({
                    $root: notifyData,
                })
            ).then((sres) => {
                console.log(`Successfully send ${unionId}:`, sres);
            }).catch(error => {
                console.error(`Failed send ${unionId}:`, error);
            });
        });
        Promise.all(sendPromises);

        console.log('continuationToken', continuationToken);
    } while (continuationToken);

    res.json({
        code: 0,
        data: sentIds
    });
});

module.exports = router;