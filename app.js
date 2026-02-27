// app.js

// Must be first: bootstrap global-agent to make Node.js respect
// GLOBAL_AGENT_HTTPS_PROXY / GLOBAL_AGENT_HTTP_PROXY env vars.
// Node.js does NOT automatically use proxy env vars unlike curl/wget.
require('global-agent/bootstrap');

const path = require('path');
const dotenv = require('dotenv');

// 预加载 lodash 子模块，防止 pkg 打包遗漏
require('lodash/omit');

// 动态加载环境配置，例如 .env.local、.env.dev 等
const configName = process.env.CONFIG_ENV || 'local';
const envPath = path.resolve(process.cwd(), `.env.${configName}`);

dotenv.config({ path: envPath });

// 加载主程序
require('./src/index.js');