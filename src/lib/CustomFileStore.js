// 导入 Node.js 内置的 fs 和 path 模块
const fs = require("fs");
const path = require("path");


// 定义一个自定义文件存储类，以实现 ConversationReferenceStore 接口
class CustomFileStore {
    constructor(directoryPath) {
        this.directoryPath = directoryPath;
        this.filePath = path.join(this.directoryPath, '.notification.localstore.json');
    }

    async add(key, reference, options) {
        const fileExists = await this.storeFileExists();
        let data = {};

        if (fileExists) {
            data = await this.readFromFile();
        } else {
            // 确保目录存在
            fs.mkdirSync(this.directoryPath, { recursive: true });
        }

        if (options.overwrite || !data[key]) {
            data[key] = reference;
            await this.writeToFile(data);
            return true;
        }
        return false;
    }

    async remove(key, reference) {
        const fileExists = await this.storeFileExists();
        if (fileExists) {
            const data = await this.readFromFile();
            if (data[key]) {
                delete data[key];
                await this.writeToFile(data);
                return true;
            }
        }
        return false;
    }

    async list(pageSize, continuationToken) {
        const fileExists = await this.storeFileExists();
        if (!fileExists) {
            return { data: [], continuationToken: '' };
        }

        const data = await this.readFromFile();
        const references = Object.values(data);
        return { data: references, continuationToken: '' };
    }

    storeFileExists() {
        return new Promise((resolve) => {
            fs.access(this.filePath, fs.constants.F_OK, (err) => {
                resolve(!err);
            });
        });
    }

    readFromFile() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filePath, 'utf8', (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(JSON.parse(data));
            });
        });
    }

    writeToFile(data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

module.exports = {
    CustomFileStore
};