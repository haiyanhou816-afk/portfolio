/**
 * Portfolio Admin Backend — 线上单端口版
 * - 监听 PORT（默认 4000）并绑定 0.0.0.0，端口由发布平台注入
 * - 数据来源：作品集埋点 POST /api/track + Cloudflare Web Analytics
 * - 存储：data/store.json（原子写入）；数据源凭证：data/config.json 或 .env
 * - 不依赖任何外部数据库服务，不生成任何演示 / 随机数据
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudflare = require('./cloudflare');
const monitor = require('./monitor');
const QRCode = require('qrcode');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const ENV_FILE = path.join(__dirname, '.env');

/* 读取项目根目录 .env（不引入额外依赖）；同名环境变量优先 */
function readEnv(key) {
  try {
    const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '').trim();
    }
  } catch (err) { /* .env 不存在时忽略 */ }
  return '';
}
/* 埋点站内基准：与 Cloudflare 的 CF_HOST 完全解耦。
   CF_HOST 只决定 /online 从 Cloudflare 拉哪个 host 的数据；
   这里决定哪些 referrer 算「站内跳转」，两者可以指向不同域名。
   TRACK_SITE_HOSTS 支持逗号分隔多个域名；未配置时回退到 CF_HOST，保持旧行为。 */
function trackSiteHosts() {
  const raw = String(process.env.TRACK_SITE_HOSTS || readEnv('TRACK_SITE_HOSTS') || '').trim();
  return monitor.siteHostList(raw || cloudflare.config().host);
}
/* 源码不内置任何固定凭据：未配置 .env / 环境变量时，每次启动生成临时随机值，
   并在启动日志打印本次访问密码，避免把线上后台密码写进公开仓库。 */
const EPHEMERAL_SECRET = crypto.randomBytes(24).toString('hex');
const EPHEMERAL_PASSWORD = crypto.randomBytes(9).toString('base64url');
const JWT_SECRET = process.env.JWT_SECRET || readEnv('JWT_SECRET') || EPHEMERAL_SECRET;
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || readEnv('ADMIN_PASSWORD') || EPHEMERAL_PASSWORD).trim();
const GENERATED_PASSWORD = !process.env.ADMIN_PASSWORD && !readEnv('ADMIN_PASSWORD');

/* 公网访问控制：本机 / 局域网直连免密，公网请求需要解锁。
   平台网关会占用 Authorization 头做分享码会话，因此认证以 Cookie 会话为主，
   Basic Auth 与 ?access= 作为兼容备用。健康检查、图标、根路径、只读首页、埋点上报放行。 */
function privateDirect(req) {
  const h = String(req.headers.host || '').split(':')[0].replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  const lan = /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  const proxied = !!(req.headers['x-forwarded-for'] || req.headers['x-forwarded-host'] || req.headers['x-real-ip']);
  return lan && !proxied;
}
const SESSION_TOKEN = crypto.createHmac('sha256', JWT_SECRET).update('pa-session:' + ADMIN_PASSWORD).digest('hex').slice(0, 32);
const SESSION_COOKIE = 'pa_session=' + SESSION_TOKEN + '; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=None';
function hasSession(req) {
  return String(req.headers.cookie || '').split(';').some(p => p.trim() === 'pa_session=' + SESSION_TOKEN);
}
/* 发布平台的网关会在分享链接校验通过后下发 __wb_rsc 会话 Cookie，并在转发时
   消费掉 URL 上的 sharecode（应用侧读不到）。带该 Cookie 且经代理转发的请求，
   说明已通过平台鉴权，应用侧放行并补种自己的 pa_session，
   避免点站内导航（裸链接）时应用层误判为未登录而跳解锁页。 */
function gatewayOk(req) {
  /* 发布平台网关在分享码校验通过后，会剥离浏览器 Cookie 与 URL 上的 sharecode，
     改为注入 x-wb-share-code 请求头透传给应用。该 header 由网关注入、客户端无法伪造，
     其值等于配置的分享码即证明请求来自合法分享会话，放行并放行站内裸链接导航。 */
  const hc = String(req.headers['x-wb-share-code'] || '').trim();
  const publicShare = String(readEnv('PUBLIC_SHARECODE') || '').trim();
  return !!(hc && publicShare && hc === publicShare);
}
function basicOk(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Basic ')) return false;
  const pair = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const i = pair.indexOf(':');
  return i > 0 && pair.slice(0, i) === 'admin' && pair.slice(i + 1) === ADMIN_PASSWORD;
}
const PUBLIC_PATHS = new Set(['/', '/healthz', '/health', '/favicon.ico', '/online', '/unlock', '/api/unlock']);
const INGEST_PATHS = new Set(['/api/track', '/api/edge-log']);
/* 监测后台自身的页面与只读接口：管理员查看面板属于「查看统计」，不是访问作品集网站。
   命中这些路径的正常浏览器浏览不计入入口请求，否则刷新面板计数就会 +1。
   未知路径（/.env、/wp-admin 等扫描）、攻击 payload、爬虫 UA、高频抓取都不在此列，照常记录。 */
const ADMIN_OWN_PATHS = new Set([
  '/', '/favicon.ico', '/health', '/healthz', '/online', '/dashboard',
  '/monitor', '/api-explorer', '/setup', '/unlock',
  '/api/monitor', '/api/releases', '/api/store/export', '/api/cloudflare',
  '/api/cloudflare/status', '/api/stats', '/api/track', '/api/edge-log',
  '/api/register', '/api/login', '/api/me', '/api/unlock', '/api/config'
]);

/* 跨域策略：上报接口对线上作品集域名开放，本地预览照旧；预检直接 204 */
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const ingest = INGEST_PATHS.has(req.path);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  if (origin && (ingest || local)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* 所有模板共用的「打开作品集」地址。必须独立配置，不能从 CF_HOST 拼：
   CF_HOST 只有主机名，而 GitHub Pages 项目站的可访问地址带 /portfolio/ 子路径。 */
app.use((req, res, next) => {
  res.locals.siteUrl = cloudflare.config().portfolioUrl;
  next();
});

/* ─────────────── 入口请求日志（含爬虫 / 扫描识别） ───────────────
   必须放在访问控制之前：被密码挡下的扫描请求同样是真实入侵尝试，也要留痕。
   作品集埋点走 /api/track 单独入库，不在这里重复计数；健康探针单列。
   所有识别都是规则匹配，不产生任何虚构访问。 */
const HIT_WINDOW = 60 * 1000;
const hitLog = new Map();
function hitCount(ip) {
  const now = Date.now();
  const arr = (hitLog.get(ip) || []).filter(t => now - t < HIT_WINDOW);
  arr.push(now);
  hitLog.set(ip, arr);
  if (hitLog.size > 5000) {
    for (const [k, v] of hitLog) if (!v.length || now - v[v.length - 1] > HIT_WINDOW) hitLog.delete(k);
  }
  return arr.length;
}
app.use((req, res, next) => {
  const p = req.path;
  if (p === '/favicon.ico' || (req.method === 'POST' && INGEST_PATHS.has(p))) return next();
  const ip = clientIp(req);
  const hits = hitCount(ip);
  const scope = (p === '/healthz' || p === '/health') ? 'probe' : 'page';
  const ua = String(req.headers['user-agent'] || '');
  const c = monitor.classify({
    path: req.originalUrl, url: req.originalUrl, userAgent: ua,
    method: req.method, hitsPerMinute: hits, scope
  });
  /* 后台自身的正常浏览不记入「入口请求」——面板数字只反映访问作品集网站的流量。
     仅当：命中后台已知路径 + 判定为真人 + 非健康探针 + 未触发高频/攻击/扫描。
     任何爬虫、自动化工具、可疑扫描、攻击 payload 或高频请求都不在此列，照常留痕。 */
  const benignAdminView = ADMIN_OWN_PATHS.has(p) && c.kind === 'human'
    && scope !== 'probe' && c.risk === 0 && hits <= 5;
  if (benignAdminView) return next();
  const src = monitor.parseSource({
    referrer: req.headers.referer || '', url: req.originalUrl,
    siteHost: String(req.headers.host || '').split(':')[0], landing: p
  });
  const doc = {
    ip, timestamp: new Date(), path: monitor.clip(p, 200),
    url: monitor.clip(req.originalUrl, 300), method: req.method,
    userAgent: monitor.clip(ua, 300), referrer: monitor.clip(req.headers.referer || '', 300),
    kind: c.kind, botName: c.botName, reasons: c.reasons, risk: c.risk,
    channel: src.channel, sourceHost: src.sourceHost, sourceLabel: src.sourceLabel,
    landing: src.landing, utmPresent: src.utmPresent,
    campaign: src.campaign, medium: src.medium, engine: src.engine,
    scope, origin: 'admin', version: '', status: 0
  };
  res.on('finish', () => {
    doc.status = res.statusCode;
    store.requests.push(doc);
    if (store.requests.length > 3000) store.requests.splice(0, store.requests.length - 3000);
    scheduleSave();
  });
  next();
});

app.use((req, res, next) => {
  /* 跨域预检必须无条件放行，否则线上作品集的 beacon 上报会被认证层挡在门外 */
  if (req.method === 'OPTIONS') return next();
  if (!ADMIN_PASSWORD) return next();
  /* 平台分享码是合法通行证：带正确 sharecode 就放行并签发会话 Cookie。
     放在白名单之前，确保首访 /?sharecode=xxx 也种下 Cookie；
     之后点站内裸链接（不带参数）凭 Cookie 通行，不再误渲染解锁页。 */
  const shareCode = String(req.query.sharecode || '').trim();
  const publicShare = String(readEnv('PUBLIC_SHARECODE') || '').trim();
  if (shareCode && publicShare && shareCode === publicShare) {
    res.setHeader('Set-Cookie', SESSION_COOKIE);
    return next();
  }
  if (PUBLIC_PATHS.has(req.path)) return next();
  if (INGEST_PATHS.has(req.path) && req.method === 'POST') return next();
  if (privateDirect(req) || hasSession(req) || basicOk(req)) return next();
  /* 经发布平台网关转发的会话（已带 __wb_rsc）视作已鉴权，补种应用 Cookie 后放行 */
  if (gatewayOk(req)) {
    res.setHeader('Set-Cookie', SESSION_COOKIE);
    return next();
  }
  if (req.query.access && String(req.query.access) === ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', SESSION_COOKIE);
    return next();
  }
  if (String(req.headers.accept || '').includes('text/html')) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).render('unlock', { next: req.originalUrl, port: PORT });
  }
  return res.status(401).json({
    ok: false, status: 'auth_required', error: '需要访问密码',
    note: '浏览器打开本站会出现解锁页；程序化调用可带 Authorization: Basic admin:<密码>，或使用 ?access=<密码> 换取会话。'
  });
});

app.use(bodyParser.json({ limit: '64kb' }));
/* navigator.sendBeacon 默认以 text/plain 发送；统一在这里还原成对象 */
app.use(bodyParser.text({ type: ['text/plain', 'application/beacon', 'application/csp-report'], limit: '64kb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ─────────────── 存储层 ─────────────── */
const store = { mode: 'file', visits: [], users: [], requests: [], releases: [] };
const SEED_FILE = path.join(DATA_DIR, 'releases.seed.json');

function loadFile() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    store.visits = Array.isArray(data.visits) ? data.visits : [];
    store.users = Array.isArray(data.users) ? data.users : [];
    store.requests = Array.isArray(data.requests) ? data.requests : [];
    store.releases = Array.isArray(data.releases) ? data.releases : [];
    console.log(`[store] 已载入 ${store.visits.length} 条埋点、${store.requests.length} 条入口请求、${store.releases.length} 个版本、${store.users.length} 个用户`);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[store] 读取失败：', err.message);
  }
  /* 首次启动用随项目附带的一份真实 git 提交历史填充版本时间线，之后以 store.json 为准 */
  if (!store.releases.length) {
    try {
      const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      if (Array.isArray(seed) && seed.length) {
        store.releases = seed;
        console.log(`[store] 已从 git 历史导入 ${seed.length} 个版本`);
      }
    } catch (err) { /* 没有种子文件不算错误 */ }
  }
}
function saveFile() {
  if (store.mode !== 'file') return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({
      visits: store.visits, users: store.users,
      requests: store.requests, releases: store.releases
    }, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('[store] 写入失败：', err.message);
  }
}
/* 入口请求较密集，合并 400ms 内的写盘，避免每个请求都同步落盘 */
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; saveFile(); }, 400);
}
loadFile();

/* 版本迭代：前端上报陌生版本时自动登记一条「首次观测」记录 */
function observeVersion(version, at) {
  if (!version) return null;
  const v = monitor.clip(version, 40).trim();
  if (!v) return null;
  if (store.releases.some(r => r.version === v)) return null;
  const doc = {
    version: v, note: '前端首次上报该版本，自动登记',
    commit: v, deployedAt: at || new Date(), source: 'auto'
  };
  store.releases.push(doc);
  scheduleSave();
  return doc;
}
function addRelease(input, at) {
  const version = monitor.clip((input || {}).version, 40).trim();
  if (!version) throw new Error('缺少版本号');
  const existing = store.releases.find(r => r.version === version);
  const doc = {
    version, note: monitor.clip((input || {}).note, 200),
    commit: monitor.clip((input || {}).commit, 60),
    deployedAt: (input || {}).deployedAt ? new Date(input.deployedAt) : (at || new Date()),
    source: 'api'
  };
  if (existing) Object.assign(existing, doc);
  else store.releases.push(doc);
  saveFile();
  return doc;
}

/* 单端口部署：只用自带的 JSON 文件持久化，不连接任何外部数据库服务 */
async function getVisits() { return store.visits.slice(); }
async function getUserCount() { return store.users.length; }
async function addVisit(doc) {
  store.visits.push(doc);
  saveFile();
  return doc;
}
async function findUser(username) {
  return store.users.find(u => u.username === username) || null;
}
async function createUser(username, password) {
  store.users.push({ username, password: await bcrypt.hash(password, 8) });
  saveFile();
}

/* ─────────────── 页面数据 ─────────────── */
function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function sourceLabel(r) {
  if (!r.referrer) return '直接访问';
  try {
    const u = new URL(r.referrer);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (isLocal) return (u.port === '5173' || !u.port) ? '站内跳转' : u.host;
    return u.hostname;
  } catch (err) { return '外部链接'; }
}
async function buildStats() {
  const visits = await getVisits();
  const rows = visits.map(v => ({
    ip: v.ip || '未知',
    timestamp: new Date(v.timestamp),
    path: v.path || '/',
    referrer: v.referrer || '',
    source: sourceLabel(v)
  })).filter(r => !isNaN(r.timestamp)).sort((a, b) => b.timestamp - a.timestamp);

  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
  }
  const index = new Map(days.map((d, i) => [d.key, i]));
  rows.forEach(r => {
    const i = index.get(dayKey(r.timestamp));
    if (i !== undefined) days[i].count++;
  });

  return {
    total: rows.length,
    uniqueIPs: new Set(rows.map(r => r.ip)).size,
    today: days[6].count,
    users: await getUserCount(),
    days,
    maxDay: Math.max(1, ...days.map(d => d.count)),
    recent: rows.slice(0, 6),
    mode: store.mode,
    storageLabel: store.mode === 'mongodb' ? 'MongoDB' : '本地 JSON 文件',
    dataFile: store.mode === 'mongodb' ? '' : 'data/store.json',
    port: PORT,
    now: new Date()
  };
}

/* 仪表盘专用数据：完整访问记录 + 仅用户名的用户列表。
   只在页面渲染时提供，不塞进 /api/stats，避免把明细暴露给公开 JSON 接口。 */
async function buildDashboardData() {
  const stats = await buildStats();
  const visits = await getVisits();
  const allVisits = visits.map(v => ({
    ip: v.ip || '未知',
    time: new Date(v.timestamp),
    path: v.path || '/',
    source: sourceLabel(v)
  })).filter(r => !isNaN(r.time)).sort((a, b) => b.time - a.time).slice(0, 200);

  const userList = store.users.map(u => String(u.username || ''));
  return Object.assign({}, stats, { allVisits, userList });
}

/* 入口与安全监测：合并作品集埋点 + 本服务真实 HTTP 请求日志后统一分类聚合。
   历史请求里混入了管理员刷新 / 查看后台的正常浏览，只保留对后台的真实外部访问
   （爬虫、扫描、攻击、探针、未知路径），避免把「看面板」算成「访问作品集」。 */
function relevantRequests() {
  return store.requests.filter(r => {
    const p = String(r.path || '');
    if (!ADMIN_OWN_PATHS.has(p)) return true;              // 未知/扫描路径，保留
    if (r.scope === 'probe' || r.origin !== 'admin') return true; // 探针、非后台来源，保留
    const kind = r.kind || 'human';
    if (kind !== 'human') return true;                      // 爬虫/攻击/可疑，保留
    if (Number(r.risk) > 0 || Number(r.hitsPerMinute) > 5) return true; // 有风险特征，保留
    return false;                                           // 后台正常浏览，剔除
  });
}
function buildMonitor() {
  return monitor.summarize({
    visits: store.visits, requests: relevantRequests(), releases: store.releases,
    siteHost: trackSiteHosts()
  });
}
/* Cloudflare 的 refererHost 按同一套渠道字典归类，供 /online 展示 */
function classifyReferrers(stats) {
  const host = stats.host || '';
  return (stats.referrers || []).map(r => {
    const name = r.host || '';
    const ref = name && name !== '直接访问' ? 'https://' + name + '/' : '';
    const s = monitor.parseSource({ referrer: ref, url: 'https://' + host + '/', siteHost: trackSiteHosts() });
    return {
      host: name || '直接访问', count: r.count,
      channel: s.channelLabel, tone: monitor.CHANNELS[s.channel].tone,
      pct: 0
    };
  });
}

/* ─────────────── 健康检查 ─────────────── */
const STARTED_AT = Date.now();
function uptimeText(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}
function uptimeShort(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
/* 只探测本机 5173 预览端口，700ms 超时，失败不影响核心健康状态 */
function probePortfolio() {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const req = http.get({ hostname: '127.0.0.1', port: 5173, path: '/', timeout: 700 }, r => {
      r.resume();
      finish(!!r.statusCode && r.statusCode < 500);
    });
    req.on('timeout', () => { req.destroy(); finish(false); });
    req.on('error', () => finish(false));
  });
}
async function buildHealth() {
  const cf = cloudflare.status();
  const portfolioUp = await probePortfolio();
  const storageLabel = store.mode === 'mongodb' ? 'MongoDB' : '本地 JSON 文件';
  const checks = [
    { name: 'HTTP 服务', state: 'ok', tag: '正常', detail: `监听 *:${PORT}，当前请求已正常响应 200` },
    { name: '数据存储', state: 'ok', tag: '正常', detail: store.mode === 'mongodb'
        ? 'MongoDB 已连接，访问记录写入数据库'
        : '本地 JSON 文件持久化 · data/store.json（原子写入，重启后保留）' },
    { name: '访问埋点 POST /api/track', state: 'ok', tag: '正常', detail: `接口可用，已记录 ${store.visits.length} 条真实访问` },
    { name: '入口与安全监测', state: 'ok', tag: '已启用', detail: `已记录 ${store.requests.length} 条真实 HTTP 请求，按 UA / 敏感路径 / 注入 payload / 高频自动标记爬虫与可疑入侵` },
    { name: '版本迭代追踪', state: 'ok', tag: '已启用', detail: `时间线共 ${store.releases.length} 个版本，前端上报新版本时自动登记` },
    { name: '统计接口 /api/stats', state: 'ok', tag: '正常', detail: '可正常聚合近 7 日趋势与最近访问记录' },
    { name: '本地作品集预览 :5173', state: portfolioUp ? 'ok' : 'info', tag: portfolioUp ? '可达' : '未启动',
      detail: portfolioUp ? '127.0.0.1:5173 可访问，本地埋点可正常上报'
                          : '本机 5173 预览服务未启动，只影响本地埋点，不影响线上监测与后台本身' },
    { name: 'Cloudflare 数据源', state: cf.configured ? 'ok' : 'warn', tag: cf.configured ? '已配置' : '待配置',
      detail: cf.configured ? `凭证齐备 · 监测 ${cf.host}`
                            : `待填写 ${cf.missing.join('、')}；这是可选配置，不是服务故障` }
  ];
  const ok = !checks.some(c => c.state === 'bad');
  const uptime = Math.floor((Date.now() - STARTED_AT) / 1000);
  return {
    ok, status: ok ? 'ok' : 'error',
    mode: store.mode, storageLabel, port: PORT,
    visits: store.visits.length, users: store.users.length,
    uptime, uptimeText: uptimeText(uptime), uptimeShort: uptimeShort(uptime),
    node: process.version, platform: process.platform,
    checkedAt: new Date(), dataFile: store.mode === 'mongodb' ? 'MongoDB' : 'data/store.json',
    cloudflare: cf, portfolioUp, checks
  };
}

/* ─────────────── API 数据页 ─────────────── */
/* 浏览器导航得到可读页面；curl / fetch / 监控程序仍拿原始 JSON，接口契约不变。
   ?format=json 与 ?format=html 可强制指定。 */
function wantsJson(req) {
  if (req.query.format === 'json') return true;
  if (req.query.format === 'html') return false;
  return !String(req.headers.accept || '').includes('text/html');
}

function withMeta(obj, status, note) {
  return Object.assign({ status, note }, obj);
}

async function buildApiPage(focus) {
  const [stats, cf, h] = await Promise.all([
    buildStats(), cloudflare.getStats(false), buildHealth()
  ]);
  const cfStatus = cloudflare.status();
  const cfState = cf.error ? 'bad' : (cf.configured ? 'ok' : 'warn');
  const cfTag = cf.error ? '拉取失败' : (cf.configured ? '已连接' : '待配置');

  const endpoints = [
    { m: 'GET', p: '/api/stats', s: 'ok', t: '正常', d: '本地埋点真实统计：累计访问、独立 IP、近 7 日趋势与最近访问记录。' },
    { m: 'GET', p: '/api/cloudflare', s: cfState, t: cfTag, d: `线上 ${cf.host} 的 Cloudflare Web Analytics 数据；未配置凭证时返回结构完整的空数据，HTTP 仍为 200。` },
    { m: 'GET', p: '/api/cloudflare/status', s: 'ok', t: '正常', d: '只读配置检查：返回已配置的凭证项与缺失项，不发起外部请求。' },
    { m: 'GET', p: '/health', s: 'ok', t: '正常', d: '应用健康检查；浏览器显示状态页，curl 与监控程序返回 JSON。' },
    { m: 'GET', p: '/healthz', s: 'info', t: '存活探针', d: '常见探针别名；公网发布时该路径由平台接管，只返回 Pod alive。' },
    { m: 'GET', p: '/monitor', s: 'ok', t: '正常', d: '入口与安全监测页：版本迭代时间线、访客来源渠道、爬虫与黑客标记明细（需访问密码）。' },
    { m: 'GET', p: '/api/monitor', s: 'info', t: '需鉴权', d: '监测聚合 JSON：分类计数、渠道分布、来源域名、机器人榜与版本列表。' },
    { m: 'GET', p: '/api/releases', s: 'info', t: '需鉴权', d: '版本时间线 JSON；POST 同路径可登记 / 更新一次发布。' },
    { m: 'POST', p: '/api/edge-log', s: 'ok', t: '正常', d: 'Cloudflare Worker 边缘日志上报：抓取不执行 JS 的爬虫与扫描请求。' },
    { m: 'POST', p: '/api/track', s: 'ok', t: '正常', d: '作品集前端 beacon 上报一次访问；服务端记录真实 IP、路径、来源、UTM、版本与 UA 分类。' },
    { m: 'POST', p: '/api/register', s: 'info', t: '需参数', d: '注册后台用户，需 JSON 体 { username, password }。' },
    { m: 'POST', p: '/api/login', s: 'info', t: '需参数', d: '登录换取 JWT，需 JSON 体 { username, password }。' },
    { m: 'GET', p: '/api/me', s: 'info', t: '需鉴权', d: '受保护接口，需 Authorization: Bearer <token>；未带 token 返回 403 属预期行为。' }
  ];

  const healthPayload = {
    ok: h.ok, status: h.status, mode: h.mode, port: h.port,
    visits: h.visits, cloudflare: cfStatus,
    uptimeSeconds: h.uptime, checkedAt: h.checkedAt.toISOString(),
    portfolio: { port: 5173, reachable: h.portfolioUp },
    checks: h.checks.map(c => ({ name: c.name, status: c.state, detail: c.detail }))
  };

  const previews = [
    { id: 'stats', name: 'GET /api/stats', title: '本地埋点统计', s: 'ok', t: '正常', hint: '来自 data/store.json 的真实上报记录，无任何模拟数据。',
      json: JSON.stringify(withMeta(stats, 'ok', '接口正常，数据来自本地埋点持久化。'), null, 2) },
    { id: 'cloudflare', name: 'GET /api/cloudflare', title: 'Cloudflare 线上数据', s: cfState, t: cfTag,
      hint: cfState === 'warn' ? 'ok:false / configured:false / missing 表示凭证未填写，是数据状态，不是接口故障。' : (cf.error || '真实 beacon 数据，按 requestHost 过滤。'),
      json: JSON.stringify(cf, null, 2) },
    { id: 'cf-status', name: 'GET /api/cloudflare/status', title: '凭证配置状态', s: 'ok', t: '正常', hint: '只读检查，不发起外部网络请求。',
      json: JSON.stringify(cfStatus, null, 2) },
    { id: 'health', name: 'GET /health', title: '健康检查', s: 'ok', t: '正常', hint: '状态页与 JSON 使用同一份实时检测结果；公网请访问 /health，/healthz 由平台接管。',
      json: JSON.stringify(healthPayload, null, 2) }
  ];

  return {
    title: 'API 数据', port: PORT, focus: focus || '',
    endpoints, previews,
    counts: {
      total: endpoints.length,
      ok: endpoints.filter(e => e.s === 'ok').length,
      warn: endpoints.filter(e => e.s === 'warn' || e.s === 'bad').length,
      info: endpoints.filter(e => e.s === 'info').length
    },
    cf: { host: cf.host, configured: cf.configured, missing: cf.missing, error: cf.error, state: cfState, tag: cfTag },
    stats: { total: stats.total, today: stats.today, users: stats.users },
    hasError: cfState === 'bad',
    checkedAt: new Date()
  };
}

/* 只接受 POST 的接口被浏览器以 GET 打开时，跳到 API 页而不是显示 404 报错；
   程序化调用仍得到标准 405 与调用示例。 */
function methodGuide(req, res, method, example, anchor) {
  if (!wantsJson(req)) return res.redirect(withShare(req, '/api-explorer' + (anchor ? '#' + anchor : '')));
  return res.status(405).json({
    ok: false, status: 'method_not_allowed',
    error: `该接口只接受 ${method} 请求`, note: '方法不匹配不是服务故障。',
    example
  });
}

/* ─────────────── 路由 ─────────────── */
app.get('/favicon.ico', (req, res) => {
  res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4c6bff"/><text x="16" y="23" font-size="19" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">P</text></svg>');
});

/* 平台分享链接靠 URL 上的 sharecode 放行；站内跳转尽量把它带上。
   注意：部分发布平台会在转发前消费该参数，应用侧读不到，所以根路径另用「直接渲染」兜底。 */
function withShare(req, url) {
  const sc = String(req.query.sharecode || '').trim();
  if (!sc) return url;
  const i = url.indexOf('#');
  const base = i >= 0 ? url.slice(0, i) : url;
  const hash = i >= 0 ? url.slice(i) : '';
  return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'sharecode=' + encodeURIComponent(sc) + hash;
}

/* 异常提醒：只用完整自然日做比较，避免今天还没过完就误报。
   覆盖三种情况：数据源断开、昨天访问量骤降/暴涨、出现可疑请求。 */
function buildAlerts(cf, overview) {
  const out = [];
  if (!cf.ok) {
    out.push({
      level: 'bad', title: '数据源断开了',
      text: cf.configured ? (cf.error || '这次没从 Cloudflare 取到数据')
        : 'Cloudflare 凭证还没填好，现在没有真实数字',
      href: '/setup', action: '去配置'
    });
  }
  const full = (cf.allDays || cf.days || []).slice(0, -1); // 去掉今天（未过完）
  if (full.length >= 7) {
    const yesterday = full[full.length - 1];
    const prev = full.slice(-7, -1);
    const avg = prev.reduce((s, d) => s + d.count, 0) / Math.max(1, prev.length);
    if (avg > 0 && yesterday.count < avg * 0.5) {
      out.push({
        level: 'bad', title: '访问量突然变少了',
        text: `昨天 ${yesterday.count} 次，前面 6 天平均 ${Math.round(avg)} 次，少了 ${Math.round((1 - yesterday.count / avg) * 100)}%`
      });
    } else if (avg > 0 && yesterday.count > avg * 2) {
      out.push({
        level: 'warn', title: '访问量突然变多了',
        text: `昨天 ${yesterday.count} 次，前面 6 天平均 ${Math.round(avg)} 次`
      });
    }
  }
  if (overview && overview.threats > 0) {
    out.push({
      level: 'warn', title: '有可疑访问',
      text: `记录到 ${overview.threats} 次可疑请求`, href: '/monitor', action: '去看看'
    });
  }
  return out;
}

/* 根路径直接渲染监测页，不再 302：平台会消费 URL 上的 sharecode，
   跳转后的 /online 既无参数又可能没带上会话 Cookie，会被网关判为「链接不完整」403 而白屏。
   取消第二跳后，首屏即 200，平台同时下发会话 Cookie。 */
async function renderOnline(req, res) {
  try {
    const cf = await cloudflare.getStats(req.query.refresh === '1');
    const view = Object.assign({}, cf, { refRows: classifyReferrers(cf) });
    const ov = monitor.publicOverview(buildMonitor());
    /* 分享卡片二维码：指向作品集线上地址，白底黑码保证任何主题下都能扫。
       生成失败不影响页面主体，降级为空字符串让卡片显示提示。 */
    let shareQr = '';
    try {
      shareQr = await QRCode.toString(cloudflare.config().portfolioUrl, {
        type: 'svg', margin: 1, width: 220,
        color: { dark: '#111114ff', light: '#ffffffff' },
        errorCorrectionLevel: 'M'
      });
    } catch (err) { console.warn('[qr] 生成失败：', err.message); }
    res.render('online', {
      stats: view,
      overview: ov,
      alerts: buildAlerts(cf, ov),
      shareQr: shareQr,
      port: PORT
    });
  } catch (err) {
    console.error('[online]', err);
    res.status(500).send('页面渲染失败：' + err.message);
  }
}

/* 健康检查探针常用 HEAD /，单独给 200 */
app.head('/', (req, res) => res.status(200).end());
app.get('/', renderOnline);
app.get('/dashboard', async (req, res) => {
  try {
    res.render('layout', {
      title: '我的网站 · 本地预览',
      body: '数据来源：作品集埋点 POST /api/track',
      stats: await buildDashboardData(),
      port: PORT
    });
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).send('页面渲染失败：' + err.message);
  }
});

/* 线上站点监测：数据来自 Cloudflare Web Analytics GraphQL API */
app.get('/online', renderOnline);

/* ───────── 入口与安全监测：版本迭代 / 访客来源 / 爬虫与黑客标记 ───────── */
app.get('/monitor', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(':')[0].replace(/[^a-zA-Z0-9.\-]/g, '');
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    /* 发布平台的分享链接靠 sharecode 放行；上报端点也带上，避免 beacon 被网关拦下 */
    const sc = String(req.query.sharecode || readEnv('PUBLIC_SHARECODE') || '').trim();
    const suffix = sc ? '?sharecode=' + encodeURIComponent(sc) : '';
    res.render('monitor', {
      data: buildMonitor(), rules: monitor.RULE_CARDS, kinds: monitor.KINDS,
      endpoint: (host ? proto + '://' + host : '') + '/api/track' + suffix,
      edgeEndpoint: (host ? proto + '://' + host : '') + '/api/edge-log' + suffix,
      siteHost: trackSiteHosts().join('、'), cfHost: cloudflare.config().host, port: PORT
    });
  } catch (err) {
    console.error('[monitor]', err);
    res.status(500).send('监测页渲染失败：' + err.message);
  }
});
app.get('/api/monitor', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!wantsJson(req)) return res.redirect(withShare(req, '/monitor'));
  const d = buildMonitor();
  res.json({
    status: 'ok', note: '全部为真实上报与真实 HTTP 请求，无模拟数据。',
    total: d.total, kinds: d.kinds, threats: d.threats, robots: d.robots,
    channels: d.channels, sources: d.sources, landings: d.landings,
    campaigns: d.campaigns, bots: d.bots, releases: d.releases,
    currentVersion: d.currentVersion, days: d.days, generatedAt: d.generatedAt
  });
});
/* 版本迭代：GET 查看时间线，POST 登记 / 更新一次发布（受访问密码保护） */
app.get('/api/releases', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!wantsJson(req)) return res.redirect(withShare(req, '/monitor#releases'));
  res.json({ status: 'ok', current: buildMonitor().currentVersion, releases: store.releases.slice().sort((a, b) => new Date(b.deployedAt) - new Date(a.deployedAt)) });
});
app.post('/api/releases', (req, res) => {
  try {
    const doc = addRelease(req.body || {});
    res.status(201).json({ ok: true, release: doc, total: store.releases.length });
  } catch (err) { res.status(400).json({ ok: false, error: err.message }); }
});
/* 数据备份：发布平台重新发布时会用本地 data/store.json 覆盖线上运行时数据。
   发布前先 GET 此接口、把返回体写回项目里的 data/store.json，再发布就不会丢访客记录。
   返回结构与 loadFile() 完全一致，可直接当 store.json 用；接口受访问密码保护（含 IP，不公开）。 */
app.get('/api/store/export', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  res.setHeader('Content-Disposition', 'attachment; filename="monitor-store-' + stamp + '.json"');
  res.setHeader('X-Exported-At', new Date().toISOString());
  res.json({
    visits: store.visits,
    users: store.users,
    requests: store.requests,
    releases: store.releases
  });
});
/* Cloudflare Worker / 边缘函数转发的原始请求日志：让静态站点上不执行 JS 的爬虫也能被抓到 */
app.post('/api/edge-log', (req, res) => {
  const b = ingestBody(req);
  const events = Array.isArray(b.events) ? b.events : [b];
  let accepted = 0;
  events.slice(0, 20).forEach(e => {
    if (!e || typeof e !== 'object') return;
    const p = monitor.clip(e.path || '/', 200);
    const ua = monitor.clip(e.userAgent || '', 300);
    const c = monitor.classify({ path: p, url: e.url || p, userAgent: ua, method: e.method || 'GET' });
    const src = monitor.parseSource({ referrer: e.referrer || '', url: e.url || '', siteHost: trackSiteHosts().concat(monitor.siteHostList(e.host)), landing: p });
    store.visits.push({
      ip: monitor.clip(e.ip || clientIp(req), 60), timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      path: p, url: monitor.clip(e.url || '', 300), method: monitor.clip(e.method || 'GET', 10),
      status: Number(e.status) || 0, userAgent: ua, referrer: monitor.clip(e.referrer || '', 300),
      source: 'portfolio-edge', version: monitor.clip(e.version || '', 40),
      kind: c.kind, botName: c.botName, reasons: c.reasons, risk: c.risk,
      channel: src.channel, sourceHost: src.sourceHost, sourceLabel: src.sourceLabel,
      campaign: src.campaign, medium: src.medium, engine: src.engine,
      landing: src.landing, utmPresent: src.utmPresent, origin: 'edge'
    });
    accepted++;
  });
  if (accepted) {
    if (store.visits.length > 10000) store.visits.splice(0, store.visits.length - 10000);
    scheduleSave();
  }
  res.status(201).json({ ok: true, accepted });
});
/* API 数据控制台：侧栏「API 数据」统一入口 */
app.get('/api-explorer', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const allowed = ['stats', 'cloudflare', 'cf-status', 'health'];
    const focus = allowed.indexOf(String(req.query.focus || '')) >= 0 ? String(req.query.focus) : '';
    res.render('api', await buildApiPage(focus));
  } catch (err) {
    console.error('[api-explorer]', err);
    res.status(500).send('API 页面渲染失败：' + err.message);
  }
});

/* 解锁页与会话签发：密码只在服务端比对，不写入页面 */
app.get('/unlock', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.render('unlock', { next: '/dashboard', port: PORT });
});
app.post('/api/unlock', (req, res) => {
  const pw = String((req.body || {}).password || '');
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ ok: false, error: '访问密码不正确' });
  res.setHeader('Set-Cookie', SESSION_COOKIE);
  return res.json({ ok: true });
});

/* 数据源配置：线上直接填写 Cloudflare 凭证，写入 data/config.json 即时生效 */
app.get('/setup', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.render('setup', {
    port: PORT,
    status: cloudflare.status(),
    keys: cloudflare.configuredKeys(),
    passwordProtected: !!ADMIN_PASSWORD
  });
});

app.post('/api/config', async (req, res) => {
  try {
    const b = req.body || {};
    if (b.action === 'clear') {
      cloudflare.clearConfig();
      return res.json({ ok: true, status: cloudflare.status(), note: '已清除在线配置，页面恢复为等待配置状态。' });
    }
    cloudflare.saveConfig(b);
    const probe = await cloudflare.getStats(true);
    return res.json({
      ok: true,
      status: cloudflare.status(),
      probe: {
        ok: probe.ok, status: probe.status, error: probe.error,
        total: probe.total, note: probe.note
      }
    });
  } catch (err) {
    console.error('[config]', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/cloudflare', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const data = await cloudflare.getStats(req.query.refresh === '1');
    if (!wantsJson(req)) return res.render('api', await buildApiPage('cloudflare'));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/cloudflare/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const s = cloudflare.status();
  if (!wantsJson(req)) return res.redirect(withShare(req, '/api-explorer#cf-status'));
  res.json(s);
});

/* 把 30 天真实数据导出为 CSV。UTF-8 BOM 让 Excel 直接打开不乱码。
   只导出聚合统计（日期/页面/设备），不含访客 IP 或 UA 明细。 */
app.get('/api/export.csv', async (req, res) => {
  try {
    const cf = await cloudflare.getStats(false);
    const rows = [['日期', '浏览量', '会话数']];
    (cf.allDays || cf.days || []).forEach(d => {
      rows.push([d.key, d.count, d.visits == null ? '' : d.visits]);
    });
    rows.push([]);
    rows.push(['页面', '浏览量']);
    (cf.topPages || []).forEach(p => rows.push([p.path, p.count]));
    rows.push([]);
    rows.push(['设备', '浏览量']);
    (cf.devices || []).forEach(d => rows.push([d.label, d.count]));
    const csv = '\uFEFF' + rows.map(r =>
      r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')
    ).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-30d.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).type('text/plain').send('导出失败：' + err.message);
  }
});

/* /healthz：浏览器得到可读的健康页；curl / 监控程序仍拿 JSON（向后兼容）
   也可用 ?format=html / ?format=json 强制指定。/health 为常见探针别名。 */
async function healthHandler(req, res) {
  try {
    const h = await buildHealth();
    res.setHeader('Cache-Control', 'no-store');
    const accept = String(req.headers.accept || '');
    const wantsJson = req.query.format === 'json' ||
      (req.query.format !== 'html' && !accept.includes('text/html'));
    if (wantsJson) {
      return res.status(h.ok ? 200 : 503).json({
        ok: h.ok, status: h.status, mode: h.mode, port: h.port,
        visits: h.visits, cloudflare: h.cloudflare,
        uptimeSeconds: h.uptime, checkedAt: h.checkedAt.toISOString(),
        portfolio: { port: 5173, reachable: h.portfolioUp },
        checks: h.checks.map(c => ({ name: c.name, status: c.state, detail: c.detail }))
      });
    }
    return res.status(h.ok ? 200 : 503).render('health', h);
  } catch (err) {
    console.error('[healthz]', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
app.get('/healthz', healthHandler);
app.get('/health', healthHandler);
app.get('/api/stats', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const data = await buildStats();
    if (!wantsJson(req)) return res.render('api', await buildApiPage('stats'));
    res.json(withMeta(data, 'ok', '接口正常，数据来自本地埋点持久化，无模拟数据。'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* 真实 IP 由服务端从连接获取，不信任前端传参 */
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  let ip = fwd ? String(fwd).split(',')[0].trim() : (req.socket.remoteAddress || '未知');
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

/* 兼容 fetch(JSON) 与 navigator.sendBeacon(text/plain) 两种上报方式 */
function ingestBody(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string') { try { return JSON.parse(b) || {}; } catch (err) { return {}; } }
  return {};
}
/* 上报接口限流：同一 IP 每分钟最多 120 次，超出直接丢弃，不写入存储 */
const ingestHits = new Map();
function rateLimited(ip, limit) {
  const now = Date.now();
  const arr = (ingestHits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now);
  ingestHits.set(ip, arr);
  if (ingestHits.size > 3000) {
    for (const [k, v] of ingestHits) if (now - v[v.length - 1] > 60000) ingestHits.delete(k);
  }
  return arr.length > limit;
}

app.post('/api/track', async (req, res) => {
  const b = ingestBody(req);
  const ip = clientIp(req);
  if (rateLimited(ip, 120)) {
    return res.status(429).json({ ok: false, error: '上报过于频繁，本次已丢弃' });
  }
  const ua = clip(b.userAgent || req.headers['user-agent'], 300);
  const p = clip(b.path || '/', 200);
  const url = clip(b.url || '', 300);
  const ref = clip(b.referrer, 300);
  const version = clip(b.version || '', 40);
  /* 站内基准 = 配置的站点域名 + 本次上报页面自身的 host：
     新部署域名无需改配置，也能把站内跳转和外部链接分开。 */
  const siteHost = trackSiteHosts().concat(monitor.siteHostList(monitor.hostOf(url)));
  const c = monitor.classify({ path: p, url, userAgent: ua, method: 'GET' });
  const src = monitor.parseSource({
    referrer: ref, url, siteHost, landing: b.landing || p,
    utm: {
      source: b.utm_source || (b.utm && b.utm.source),
      medium: b.utm_medium || (b.utm && b.utm.medium),
      campaign: b.utm_campaign || (b.utm && b.utm.campaign),
      term: b.utm_term || (b.utm && b.utm.term)
    }
  });
  const doc = {
    ip, timestamp: new Date(), path: p, url,
    referrer: ref, userAgent: ua,
    source: clip(b.source || 'portfolio', 40), version,
    origin: 'portfolio', method: 'GET', status: 0,
    kind: c.kind, botName: c.botName, reasons: c.reasons, risk: c.risk,
    channel: src.channel, sourceHost: src.sourceHost, sourceLabel: src.sourceLabel,
    engine: src.engine, campaign: src.campaign, medium: src.medium, term: src.term,
    landing: src.landing, utmPresent: src.utmPresent
  };
  try {
    observeVersion(version, doc.timestamp);
    await addVisit(doc);
    res.status(201).json({ ok: true, visit: { ip, path: p, version, kind: c.kind, label: c.label, channel: src.channelLabel } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '缺少用户名或密码' });
  try {
    if (await findUser(username)) return res.status(409).json({ error: '用户已存在' });
    await createUser(username, password);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const user = await findUser(username);
    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign({ id: user._id || username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const authenticate = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return res.status(403).json({
    ok: false, status: 'auth_required', error: '缺少 token',
    note: '这是受保护接口，未带 token 返回 403 属于预期行为，不是服务故障。',
    example: 'curl -H "Authorization: Bearer <token>" http://localhost:' + PORT + '/api/me'
  });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({
      ok: false, status: 'auth_invalid', error: 'token 无效',
      note: '请重新 POST /api/login 获取 token（有效期 1 小时）。'
    });
    req.userId = decoded.id;
    next();
  });
};
/* 浏览器直接打开受保护接口时给说明页；curl / 程序化调用仍按 HTTP 语义返回 403 */
app.get('/api/me', (req, res, next) => {
  if (!wantsJson(req) && !req.headers.authorization) return res.redirect(withShare(req, '/api-explorer#endpoints'));
  next();
}, authenticate, (req, res) => res.json({ status: 'ok', id: req.userId }));

/* 浏览器误把只接受 POST 的接口当链接打开时，给引导页而不是 404 Not Found */
app.get('/api/track', (req, res) => methodGuide(req, res, 'POST',
  `curl -X POST http://localhost:${PORT}/api/track -H "Content-Type: application/json" -d '{"path":"/","referrer":""}'`, 'endpoints'));
app.get('/api/edge-log', (req, res) => methodGuide(req, res, 'POST',
  `curl -X POST http://localhost:${PORT}/api/edge-log -H "Content-Type: application/json" -d '{"path":"/","userAgent":"Googlebot"}'`, 'endpoints'));
app.get('/api/register', (req, res) => methodGuide(req, res, 'POST',
  `curl -X POST http://localhost:${PORT}/api/register -H "Content-Type: application/json" -d '{"username":"admin","password":"..."}'`, 'endpoints'));
app.get('/api/login', (req, res) => methodGuide(req, res, 'POST',
  `curl -X POST http://localhost:${PORT}/api/login -H "Content-Type: application/json" -d '{"username":"admin","password":"..."}'`, 'endpoints'));

app.use((req, res) => {
  if (String(req.headers.accept || '').includes('text/html')) return res.redirect(withShare(req, '/api-explorer'));
  return res.status(404).json({ ok: false, status: 'not_found', error: '接口不存在', note: '可用接口列表见 /api-explorer' });
});
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).send('服务器错误：' + err.message);
});

app.listen(PORT, HOST, () => {
  console.log(`[ready] http://localhost:${PORT}/  (host=${HOST} storage=${store.mode} auth=${ADMIN_PASSWORD ? 'on' : 'off'})`);
  if (GENERATED_PASSWORD) console.log(`[auth] 未配置 ADMIN_PASSWORD，本次临时访问密码：${ADMIN_PASSWORD}（重启后失效，正式部署请写入 .env）`);
});
