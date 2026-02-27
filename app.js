// app.js

// Must be first: patch Node.js https to use HTTPS_PROXY if set.
// Node.js does NOT automatically respect HTTPS_PROXY unlike curl/wget.
const _httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (_httpsProxy) {
  const { HttpsProxyAgent } = require('https-proxy-agent');
  require('https').globalAgent = new HttpsProxyAgent(_httpsProxy);
  require('http').globalAgent = new (require('https-proxy-agent').HttpsProxyAgent)(_httpsProxy);
  console.log('[Proxy] Node.js HTTPS agent configured via:', _httpsProxy);
}

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