/**
 * Cloudflare Web Analytics 数据源
 * 文档：https://developers.cloudflare.com/analytics/graphql-api/
 * 数据集：rumPageloadEventsAdaptiveGroups（浏览器 beacon 事件，count = 浏览量，sum.visits = 会话）
 *
 * 配置来源：项目根目录 .env，或同名环境变量（环境变量优先）
 *   CF_API_TOKEN   Account → Account Analytics → Read 的 API Token
 *   CF_ACCOUNT_ID  Cloudflare Account ID（32 位十六进制）
 *   CF_SITE_TAG    Web Analytics 的 site_tag（rum/site_info/list 返回的 site_tag，用于 GraphQL filter.siteTag）
 *                 注意：它与 beacon 片段里的 token（site_token）、onboarding 引导页临时 token 三者可能不同，勿混用
 *   CF_HOST        要统计的主机名，默认 portfolio-6zk.pages.dev
 *
 * 注意：GraphQL 查询级错误以 HTTP 200 + errors[] 返回，必须检查 errors[]。
 *      一个 siteTag 可能覆盖多个主机名，必须按 requestHost 过滤。
 */
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const DEFAULT_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const DEFAULT_HOST = 'portfolio-6zk.pages.dev';
const CACHE_TTL = 60 * 1000;

let cache = { at: 0, data: null };
let fileConfig = {};

/* 线上「数据源配置」页写入的凭证；进程启动时载入，重启后保留 */
function loadConfig() {
  try {
    const o = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    fileConfig = o && typeof o === 'object' ? o : {};
    if (Object.keys(fileConfig).length) console.log('[cf] 已载入在线配置');
  } catch (err) { fileConfig = {}; }
}
loadConfig();

function parseEnv() {
  const out = {};
  try {
    fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) {
        out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    });
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[cf] 读取 .env 失败：', err.message);
  }
  return out;
}

/* 优先级：环境变量 > 在线配置 data/config.json > .env > 默认值 */
function config() {
  const file = parseEnv();
  const pick = (k, fallback) => process.env[k] || fileConfig[k] || file[k] || fallback;
  return {
    token: pick('CF_API_TOKEN', ''),
    accountId: pick('CF_ACCOUNT_ID', ''),
    siteTag: pick('CF_SITE_TAG', ''),
    host: pick('CF_HOST', DEFAULT_HOST),
    endpoint: pick('CF_GRAPHQL_ENDPOINT', DEFAULT_ENDPOINT)
  };
}

/* 只保存四项凭证；不回显 token 明文。保存后立刻清缓存，让下一次请求用新凭证。 */
function saveConfig(input) {
  const next = {
    CF_API_TOKEN: String(input.CF_API_TOKEN || fileConfig.CF_API_TOKEN || '').trim(),
    CF_ACCOUNT_ID: String(input.CF_ACCOUNT_ID || fileConfig.CF_ACCOUNT_ID || '').trim(),
    CF_SITE_TAG: String(input.CF_SITE_TAG || fileConfig.CF_SITE_TAG || '').trim(),
    CF_HOST: String(input.CF_HOST || fileConfig.CF_HOST || DEFAULT_HOST).trim() || DEFAULT_HOST
  };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, CONFIG_FILE);
  fileConfig = next;
  cache = { at: 0, data: null };
  return next;
}
function clearConfig() {
  try { fs.unlinkSync(CONFIG_FILE); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  fileConfig = {};
  cache = { at: 0, data: null };
}
function configuredKeys() {
  const c = config();
  return {
    CF_API_TOKEN: !!c.token,
    CF_ACCOUNT_ID: !!c.accountId,
    CF_SITE_TAG: !!c.siteTag,
    CF_HOST: c.host,
    source: Object.keys(fileConfig).length ? 'online' : 'env'
  };
}

function status() {
  const c = config();
  const missing = [];
  if (!c.token) missing.push('CF_API_TOKEN');
  if (!c.accountId) missing.push('CF_ACCOUNT_ID');
  if (!c.siteTag) missing.push('CF_SITE_TAG');
  return {
    configured: missing.length === 0, missing, host: c.host,
    status: missing.length ? 'not_configured' : 'configured',
    note: missing.length
      ? '这是可选配置，不是接口故障：未填写凭证时接口仍正常返回 200，只是不渲染统计数字。可在「数据源配置」页在线填写。'
      : '凭证齐备，可从 Cloudflare GraphQL Analytics API 读取真实数据。'
  };
}

const QUERY = `query($account: String!, $site: String!, $start30: Date!, $start7: Date!, $end: Date!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      daily: rumPageloadEventsAdaptiveGroups(
        limit: 2000
        filter: { siteTag: $site, date_geq: $start30, date_leq: $end }
        orderBy: [date_ASC]
      ) {
        count
        sum { visits }
        dimensions { date requestHost }
      }
      paths: rumPageloadEventsAdaptiveGroups(
        limit: 100
        filter: { siteTag: $site, date_geq: $start7, date_leq: $end }
        orderBy: [count_DESC]
      ) {
        count
        dimensions { requestHost requestPath }
      }
      referrers: rumPageloadEventsAdaptiveGroups(
        limit: 50
        filter: { siteTag: $site, date_geq: $start7, date_leq: $end }
        orderBy: [count_DESC]
      ) {
        count
        dimensions { refererHost }
      }
    }
  }
}`;

const dayStr = d => new Date(d).toISOString().slice(0, 10);

function emptyStats(c, error, missing) {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push({ key: dayStr(d), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
  }
  const state = missing && missing.length ? 'not_configured' : (error ? 'error' : 'empty');
  const notes = {
    not_configured: '接口正常（HTTP 200）。ok:false 与 missing 只表示 Cloudflare 凭证尚未填写，属于可选配置，不是报错；在「数据源配置」页填好后会自动切换为真实数据。',
    error: '凭证已配置，但本次从 Cloudflare 拉取数据失败；详见 error 字段。',
    empty: '接口正常，但 Cloudflare 暂无匹配数据。'
  };
  return {
    source: 'cloudflare', host: c.host, ok: false,
    status: state, note: notes[state],
    configured: missing ? missing.length === 0 : true,
    missing: missing || [], error: error || null,
    total: 0, visits: 0, today: 0, days, maxDay: 1,
    topPages: [], referrers: [], fetchedAt: null
  };
}

function shape(rows, c) {
  const accounts = rows && rows.viewer && rows.viewer.accounts;
  if (!accounts || !accounts.length || !accounts[0]) {
    throw new Error('Cloudflare 返回空账户数据，请确认 CF_ACCOUNT_ID 是否正确');
  }
  const a = accounts[0];
  const matchHost = row => !c.host || !row.dimensions.requestHost || row.dimensions.requestHost === c.host;

  const byDate = new Map();
  (a.daily || []).filter(matchHost).forEach(r => {
    const key = r.dimensions.date;
    const prev = byDate.get(key) || { count: 0, visits: 0 };
    prev.count += r.count || 0;
    prev.visits += (r.sum && r.sum.visits) || 0;
    byDate.set(key, prev);
  });

  const today = new Date();
  const days = [];
  let total = 0, visits = 0;
  for (let i = 29; i >= 0; i--) {
    const key = dayStr(new Date(today.getTime() - i * 86400000));
    const v = byDate.get(key) || { count: 0, visits: 0 };
    total += v.count;
    visits += v.visits;
    if (i < 7) {
      const d = new Date(key + 'T00:00:00Z');
      days.push({ key, label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`, count: v.count });
    }
  }

  const topPages = (a.paths || []).filter(matchHost).map(r => ({
    path: r.dimensions.requestPath || '/', count: r.count || 0
  })).sort((x, y) => y.count - x.count).slice(0, 6);

  const referrers = (a.referrers || []).map(r => ({
    host: r.dimensions.refererHost || '直接访问', count: r.count || 0
  })).sort((x, y) => y.count - x.count).slice(0, 5);

  return {
    source: 'cloudflare', host: c.host, ok: true,
    status: 'ok', note: '已从 Cloudflare GraphQL Analytics API 拉取真实浏览器 beacon 数据，并按 requestHost 过滤。',
    configured: true, missing: [], error: null,
    total, visits, today: days[6] ? days[6].count : 0,
    days, maxDay: Math.max(1, ...days.map(d => d.count)),
    topPages, referrers, fetchedAt: new Date()
  };
}

async function getStats(force) {
  const c = config();
  const missing = status().missing;
  if (missing.length) return emptyStats(c, null, missing);
  if (!force && cache.data && Date.now() - cache.at < CACHE_TTL) return cache.data;

  const end = dayStr(new Date());
  const variables = {
    account: c.accountId,
    site: c.siteTag,
    start30: dayStr(new Date(Date.now() - 29 * 86400000)),
    start7: dayStr(new Date(Date.now() - 6 * 86400000)),
    end
  };

  try {
    const res = await fetch(c.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + c.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: QUERY, variables }),
      signal: AbortSignal.timeout(12000)
    });
    const json = await res.json();
    // Cloudflare 的查询错误是 HTTP 200 + errors[]，只看 status 会把错误当成空数据
    if (json.errors && json.errors.length) {
      const msg = json.errors.map(e => e.message || '未知错误').join('；');
      console.warn('[cf] GraphQL 查询错误：', msg);
      return emptyStats(c, 'Cloudflare 查询失败：' + msg, missing);
    }
    if (!res.ok) return emptyStats(c, 'Cloudflare 接口返回 HTTP ' + res.status, missing);
    const data = shape(json.data, c);
    cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.warn('[cf] 拉取失败：', err.message);
    return emptyStats(c, '无法连接 Cloudflare：' + err.message, missing);
  }
}

module.exports = { getStats, status, config, saveConfig, clearConfig, configuredKeys };
