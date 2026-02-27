const mongoose = require('mongoose');

// 定义通知连接的 Mongoose Schema，并启用时间戳
const NotificationReferenceSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    reference: { type: mongoose.Schema.Types.Mixed, required: true },
    // 增加一个 aadObjectId 字段来存储用户ID，方便查询
    aadObjectId: { type: String, required: false, unique: false },
}, { timestamps: true }); // 启用 timestamps 选项，自动添加 createdAt 和 updatedAt 字段


const MongoTabName = process.env.MONGODB_TAB_NAME_STRING || 'NotificationReference';

// 使用默认集合名 'notificationreferences'，Mongoose 会自动将集合名复数化
const NotificationReference = mongoose.model(MongoTabName, NotificationReferenceSchema);

class CustomMongoStore {
    /**
     * 构造函数，初始化并立即开始连接 MongoDB。
     * @param {string} connectionString MongoDB 连接字符串，必须包含数据库名。
     */
    constructor(connectionString) {
        this.connectionString = connectionString;
        this.connectPromise = this.connect();
    }

    /**
     * 异步方法，用于连接到 MongoDB。
     * 只有在连接状态不为1（已连接）时才执行连接操作。
     */
    async connect() {
        if (mongoose.connection.readyState !== 1) {
            console.log('正在连接到 MongoDB...');
            try {
                await mongoose.connect(this.connectionString);
                console.log('成功连接到 MongoDB。');
            } catch (error) {
                console.error('连接 MongoDB 失败:', error);
                throw error;
            }
        }
    }

    /**
     * 添加或更新通知连接引用。
     * @param {string} key 引用键。
     * @param {object} reference 要保存的连接引用对象。
     * @param {{ overwrite: boolean }} options 是否覆盖已存在的文档。
     * @returns {Promise<boolean>} 如果添加或更新成功则返回 true，否则返回 false。
     */
    async add(key, reference, options) {
        await this.connectPromise; // 等待连接完成

        // 从 reference 对象中提取 aadObjectId
        const aadObjectId = reference.user?.aadObjectId;

        if (!options.overwrite) {
            const existingDoc = await NotificationReference.findOne({ key: key });
            if (existingDoc) {
                return false;
            }
        }

        await NotificationReference.updateOne(
            { key: key },
            // 在更新/插入时同时存储 aadObjectId
            { $set: { key: key, reference: reference, aadObjectId: aadObjectId } },
            { upsert: true }
        );

        return true;
    }

    /**
     * 移除通知连接引用。
     * @param {string} key 引用键。
     * @param {object} reference 要移除的连接引用对象 (此参数未在实现中使用)。
     * @returns {Promise<boolean>} 如果文档存在并被移除则返回 true，否则返回 false。
     */
    async remove(key, reference) {
        await this.connectPromise; // 等待连接完成
        const result = await NotificationReference.deleteOne({ key: key });
        return result.deletedCount > 0;
    }

    /**
     * 列出所有存储的通知连接引用。
     * @param {number} pageSize 分页大小。
     * @param {string} continuationToken JSON字符串，包含分页和过滤条件。
     * @returns {Promise<object>} 包含数据和继续令牌的对象。
     */
    async list(pageSize = 100, continuationToken) {

        // console.log('list pageSize', pageSize, continuationToken);
        await this.connectPromise; // 等待连接完成

        let filters = {};
        let pageMap = { offset: 0, filters: {} }; // 包含filters作为默认值
        // 解析JSON字符串形式的continuationToken
        if (continuationToken) {
            try {
                pageMap = JSON.parse(continuationToken);
                // 合并filters到查询条件中，并支持in查询
                if (pageMap.filters) {
                    filters = { ...pageMap.filters };
                }
                console.log(filters);
            } catch (error) {
                console.error('Failed to parse continuationToken JSON:', error);
            }
        }
        // 使用 skip 和 limit 实现 offset 分页
        const documents = await NotificationReference.find(filters)
            .skip(pageMap.offset)
            .limit(pageSize)
            .sort({ _id: 1 })
            .exec();

        // 计算下一页的 offset
        const newOffset = documents.length === pageSize
            ? pageMap.offset + pageSize
            : null;

        // console.log('documents.length ', documents.length, continuationToken);

        const newContinuationToken = newOffset !== null
            ? JSON.stringify({ ...pageMap, offset: newOffset })
            : null;

        const data = documents.map(doc => doc.reference);
        return { data: data, continuationToken: newContinuationToken };
    }
}

module.exports = {
    CustomMongoStore
};