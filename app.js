// app.js

// Must be first: patch Node.js https to use HTTPS_PROXY if set.
// Node.js does NOT automatically respect HTTPS_PROXY unlike curl/wget.
//
// IMPORTANT: require('https-proxy-agent') must be at the top level (not inside
// the if-block) so that `pkg` static analysis detects and bundles it into the
// binary. A conditional require is invisible to pkg's bundler.
const { HttpsProxyAgent } = require('https-proxy-agent');

const _httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (_httpsProxy) {
  const agent = new HttpsProxyAgent(_httpsProxy);
  require('https').globalAgent = agent;
  require('http').globalAgent = agent;
  console.log('[Proxy] Node.js HTTPS/HTTP agent configured via:', _httpsProxy);
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