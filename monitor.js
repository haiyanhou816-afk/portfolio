/**
 * monitor.js — 入口来源 / 版本迭代 / 爬虫与威胁识别引擎
 *
 * 设计原则：
 *  - 纯计算，不持有状态、不写文件、不联网；状态由 index.js 的 store 管理。
 *  - 只依据真实上报字段（UA、路径、referrer、UTM、IP 频率）分类，绝不生成演示数据。
 *  - 历史埋点记录缺少新字段时，按同一套规则在读取时重新分类，老数据也能被标记。
 */
'use strict';

/* ───────────── 分类字典 ───────────── */
const KINDS = {
  human:      { label: '真人访客',       tone: 'ok',   severity: 0, desc: '正常浏览器访问' },
  crawler:    { label: '搜索爬虫',       tone: 'info', severity: 0, desc: '搜索引擎 / 社交预览机器人' },
  ai:         { label: 'AI 爬虫',        tone: 'info', severity: 0, desc: '大模型与 AI 搜索抓取' },
  bot:        { label: '自动化工具',     tone: 'muted',severity: 1, desc: '命令行、无头浏览器、脚本' },
  probe:      { label: '监控探针',       tone: 'muted',severity: 0, desc: '平台健康检查 / 拨测' },
  suspicious: { label: '可疑请求',       tone: 'warn', severity: 2, desc: '敏感路径扫描、异常 UA、高频访问' },
  attack:     { label: '攻击尝试',       tone: 'bad',  severity: 3, desc: '注入 payload、漏洞利用、黑客工具' }
};
const ORDER = { human: 0, probe: 0, crawler: 1, ai: 1, bot: 2, suspicious: 3, attack: 4 };

/* ───────────── UA 规则（顺序即优先级） ───────────── */
const UA_RULES = [
  { re: /sqlmap|nikto|acunetix|nessus|wpscan|havij|dirbuster|gobuster|ffuf|zgrab|metasploit|nmap scripting|arachni|webscarab|commix|xsser|w3af/i,
    kind: 'attack', name: '漏洞扫描 / 黑客工具', score: 90, reason: 'UA 命中已知攻击或漏洞扫描工具' },
  { re: /masscan|zmap|shodan|censys|internetmeasurement|researchscan|netsystemsresearch|expanse|palantir|binaryedge|leakix/i,
    kind: 'suspicious', name: '互联网测绘 / 情报扫描', score: 45, reason: 'UA 命中全网测绘与资产探测标识' },
  { re: /curl\/|wget\/|python-requests|python-urllib|aiohttp|httpie|postmanruntime|insomnia|go-http-client|okhttp|libwww-perl|node-fetch|undici|axios\/|scrapy|winhttp|powershell|java\/1\.|php\/|ruby\/|perl\/|http_request2/i,
    kind: 'bot', name: '命令行 / 脚本客户端', score: 25, reason: '非浏览器客户端 UA，通常为脚本或接口调用' },
  { re: /headlesschrome|phantomjs|puppeteer|playwright|selenium|chrome-lighthouse|lighthouse|htmllunit|electron\/.*(?:puppeteer|playwright)/i,
    kind: 'bot', name: '无头浏览器 / 自动化', score: 25, reason: '无头浏览器 UA，属于自动化访问' },
  { re: /googlebot|google-inspectiontool|mediapartners-google/i, kind: 'crawler', name: 'Googlebot', score: 0, reason: 'Google 搜索爬虫' },
  { re: /bingbot|msnbot|adidxbot/i, kind: 'crawler', name: 'Bingbot', score: 0, reason: 'Bing 搜索爬虫' },
  { re: /baiduspider/i, kind: 'crawler', name: 'Baiduspider', score: 0, reason: '百度搜索爬虫' },
  { re: /sogou|sosospider|360spider|haosouspider|yisouspider/i, kind: 'crawler', name: '中文搜索爬虫', score: 0, reason: '搜狗 / 360 / 神马等中文搜索引擎' },
  { re: /yandexbot|duckduckbot|seznambot|ecosia|bravebot|petalbot|applebot|yahoo! slurp/i, kind: 'crawler', name: '其他搜索爬虫', score: 0, reason: '其他搜索引擎爬虫' },
  { re: /ahrefsbot|semrushbot|mj12bot|dotbot|screaming frog|seo|linkdex|blexbot|serpstatbot|dataforseo/i,
    kind: 'crawler', name: 'SEO 分析爬虫', score: 0, reason: 'SEO / 外链分析机器人' },
  { re: /gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|ccbot|google-extended|applebot-extended|amazonbot|bytespider|cohere-ai|diffbot|timpibot|omgili|youbot/i,
    kind: 'ai', name: 'AI 大模型爬虫', score: 0, reason: 'AI 搜索 / 大模型训练抓取' },
  { re: /facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|whatsapp|line-poker|pinterest|redditbot|embedly|quora link preview|vkshare/i,
    kind: 'crawler', name: '社交预览机器人', score: 0, reason: '社交平台链接预览抓取' },
  { re: /kube-probe|googlehc|uptimerobot|pingdom|statuscake|betteruptime|site24x7|nagios|zabbix|prometheus|healthcheck|elb-healthchecker/i,
    kind: 'probe', name: '健康检查探针', score: 0, reason: '平台或监控系统的存活探测' }
];

/* ───────────── 路径 / payload 规则 ───────────── */
const ATTACK_PATH = /(?:union[\s%20]+select|select[\s%20]+[\w*,]+[\s%20]+from[\s%20]|or[\s%20]+1[\s%20]*=[\s%20]*1|information_schema|xp_cmdshell|waitfor[\s%20]+delay|benchmark\s*\(|sleep\s*\(\s*\d|<\s*script|javascript:|onerror\s*=|\$\{jndi:|base64_decode|system\s*\(|eval\s*\(|\/etc\/passwd|\.\.\/\.\.\/|%2e%2e%2f|proc\/self\/environ|phpinfo|\/actuator\/env|\/cgi-bin\/|boaform|wso\.php|shell\.php|\.php\?.*=(?:https?:|ftp:))/i;
const SCAN_PATH = /(?:\/\.env\b|\/\.git\b|\/\.aws\b|\/\.ssh\b|wp-admin|wp-login|wp-content|wp-config|phpmyadmin|\/adminer|xmlrpc\.php|\/config\.php|database\.sql|\/\.htaccess|\/server-status|\/actuator|\/druid|\/solr|\/jenkins|\/manager\/html|\/webdav|\/\.DS_Store|\/backup|\.sql$|\.bak$|\.zip$|\.rar$|\.tar\.gz$|\.jsp$|\.asp$|\/\.well-known\/security\.txt)/i;

/* ───────────── 来源渠道字典 ───────────── */
const ENGINES = [
  [/google\./i, 'Google'], [/bing\.com/i, 'Bing'], [/baidu\.com/i, '百度'],
  [/sogou\.com/i, '搜狗'], [/so\.com|360\.cn/i, '360 搜索'], [/sm\.cn/i, '神马搜索'],
  [/yandex\./i, 'Yandex'], [/duckduckgo\.com/i, 'DuckDuckGo'], [/yahoo\./i, 'Yahoo'],
  [/ecosia\.org/i, 'Ecosia'], [/brave\.com/i, 'Brave'], [/toutiao\.com/i, '头条搜索'],
  [/shenma|quark\.cn|uc\.cn/i, '夸克 / UC']
];
const SOCIALS = [
  [/weibo\.com|weibo\.cn/i, '微博'], [/zhihu\.com/i, '知乎'], [/xiaohongshu\.com|xhslink/i, '小红书'],
  [/douyin\.com|iesdouyin/i, '抖音'], [/bilibili\.com|b23\.tv/i, 'B 站'], [/weixin\.qq\.com|qq\.com|wechat/i, '微信 / QQ'],
  [/linkedin\.com/i, 'LinkedIn'], [/x\.com|twitter\.com|t\.co/i, 'X / Twitter'],
  [/facebook\.com|fb\.com|instagram\.com/i, 'Facebook / Instagram'], [/github\.com/i, 'GitHub'],
  [/behance\.net|dribbble\.com|pinterest\.com/i, '设计社区'], [/reddit\.com/i, 'Reddit'],
  [/youtube\.com|youtu\.be/i, 'YouTube'], [/juejin\.cn|csdn\.net|segmentfault\.com/i, '技术社区'],
  [/telegram\.org|t\.me|discord\.com/i, '即时通讯社区']
];
const AI_REFS = [
  [/chatgpt\.com|chat\.openai\.com|openai\.com/i, 'ChatGPT'], [/claude\.ai|anthropic\.com/i, 'Claude'],
  [/perplexity\.ai/i, 'Perplexity'], [/gemini\.google\.com|bard\.google\.com/i, 'Gemini'],
  [/copilot\.microsoft\.com/i, 'Copilot'], [/doubao\.com/i, '豆包'], [/kimi\.moonshot\.cn|moonshot\.cn/i, 'Kimi'],
  [/tongyi\.aliyun\.com|qwen\.ai/i, '通义千问'], [/yuanbao\.tencent\.com/i, '元宝']
];
const CHANNELS = {
  direct:   { label: '直接访问',   tone: 'muted', desc: '地址栏输入、书签、无 referrer 的打开方式' },
  internal: { label: '站内跳转',   tone: 'ok',    desc: '从本站其他页面点进来' },
  search:   { label: '自然搜索',   tone: 'info',  desc: '搜索引擎结果页点进来的访客' },
  paid:     { label: '付费投放',   tone: 'amber', desc: '带广告点击标识（gclid / 付费 UTM）的来访' },
  social:   { label: '社交媒体',   tone: 'info',  desc: '社交平台、社区与设计平台的外链' },
  ai:       { label: 'AI 助手',    tone: 'violet',desc: '从 ChatGPT / Claude 等 AI 对话跳转' },
  referral: { label: '外部链接',   tone: 'ok',    desc: '其他网站指向本站的链接' },
  unknown:  { label: '未识别来源', tone: 'muted', desc: '来源格式无法解析' }
};

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (err) { return ''; }
}
function clip(v, n) { return String(v == null ? '' : v).slice(0, n); }

/**
 * 站内基准域名：作品集可能同时部署在多个域名（GitHub Pages / Cloudflare Pages）。
 * 支持数组、逗号/分号/空格分隔的字符串，或带协议与端口的写法，统一规范化。
 * 与 Cloudflare 的 CF_HOST 完全解耦：CF_HOST 只用于 /online 过滤 requestHost。
 */
function siteHostList(v) {
  const arr = Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,;\s]+/);
  return arr.map(s => String(s || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
    .replace(/^www\./, '')).filter(Boolean);
}
/** 某个 referrer 主机名是否属于本站（含子域与本地预览） */
function isInternalHost(refHost, hosts) {
  const h = String(refHost || '').toLowerCase().replace(/^www\./, '');
  if (!h) return false;
  if (h === 'localhost' || h === '127.0.0.1') return true;
  return siteHostList(hosts).some(s => h === s || h.endsWith('.' + s));
}

/**
 * 解析一次访问的来源渠道。
 * @param {object} o { referrer, url, utm:{source,medium,campaign,term}, siteHost, landing }
 *                     siteHost 可传单个主机名、逗号分隔的多个主机名，或数组。
 */
function parseSource(o) {
  o = o || {};
  const referrer = clip(o.referrer, 500);
  const url = clip(o.url, 500);
  const utm = o.utm && typeof o.utm === 'object' ? o.utm : {};
  const siteHosts = siteHostList(o.siteHost);
  let q = {};
  try { q = Object.fromEntries(new URL(url || 'http://local/').searchParams.entries()); } catch (err) { q = {}; }
  const pick = (a, b) => clip(a || b || '', 80);
  const source = pick(utm.source, q.utm_source || q.ref || q.from);
  const medium = pick(utm.medium, q.utm_medium);
  const campaign = pick(utm.campaign, q.utm_campaign);
  const term = pick(utm.term, q.utm_term || q.q || q.keyword || q.wd);
  const adClick = !!(q.gclid || q.fbclid || q.msclkid || q.dclid || /^(cpc|ppc|paid|ads?)$/i.test(medium) || /ad|sem|投放/i.test(source));

  const refHost = hostOf(referrer);
  let channel = 'unknown', label = '', engine = '';

  if (adClick) {
    channel = 'paid';
    label = source || (q.gclid ? 'Google Ads' : (q.fbclid ? 'Meta Ads' : '广告投放'));
  } else if (refHost && isInternalHost(refHost, siteHosts)) {
    channel = 'internal'; label = refHost === 'localhost' || refHost === '127.0.0.1' ? '本地预览 / 站内跳转' : '站内跳转';
  } else if (refHost) {
    const eng = ENGINES.find(([re]) => re.test(refHost));
    const soc = SOCIALS.find(([re]) => re.test(refHost));
    const air = AI_REFS.find(([re]) => re.test(refHost));
    if (eng) { channel = 'search'; label = eng[1]; engine = eng[1]; }
    else if (air) { channel = 'ai'; label = air[1]; }
    else if (soc) { channel = 'social'; label = soc[1]; }
    else { channel = 'referral'; label = refHost; }
  } else if (source) {
    if (/google|bing|baidu|sogou|360|搜索/i.test(source)) { channel = 'search'; label = source; }
    else if (/weibo|wechat|weixin|zhihu|xhs|douyin|bilibili|github|linkedin|twitter|facebook|social/i.test(source)) { channel = 'social'; label = source; }
    else if (/chatgpt|claude|perplexity|gemini|ai|kimi|doubao/i.test(source)) { channel = 'ai'; label = source; }
    else { channel = 'referral'; label = source; }
  } else {
    channel = 'direct'; label = '直接访问';
  }

  return {
    channel, channelLabel: CHANNELS[channel].label,
    sourceHost: refHost || (label && channel === 'referral' ? label : ''),
    sourceLabel: label || CHANNELS[channel].label,
    engine, campaign, medium, term,
    landing: clip(o.landing || (() => { try { return new URL(url).pathname; } catch (e) { return '/'; } })(), 200),
    utmPresent: !!(source || campaign || medium)
  };
}

/**
 * 对一次 HTTP 访问做威胁分类与标记。
 * @returns {{kind,botName,reasons,risk,label,tone,severity}}
 */
function classify(o) {
  o = o || {};
  const ua = String(o.userAgent || '');
  const raw = String(o.path || '/') + ' ' + String(o.url || '');
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (err) { /* 保留原文 */ }
  const reasons = [];
  let kind = 'human', botName = '', risk = 0;

  for (const r of UA_RULES) {
    if (r.re.test(ua)) {
      kind = r.kind; botName = r.name; risk += r.score; reasons.push(r.reason);
      break;
    }
  }
  if (ATTACK_PATH.test(decoded)) {
    risk += 80; reasons.push('URL 含注入 / 漏洞利用 payload');
    if (ORDER.attack > ORDER[kind]) kind = 'attack';
    if (!botName) botName = '注入 / 漏洞利用请求';
  } else if (SCAN_PATH.test(decoded)) {
    risk += 40; reasons.push('请求了敏感路径或常见后门探测地址');
    if (ORDER.suspicious > ORDER[kind]) kind = 'suspicious';
    if (!botName) botName = '路径扫描';
  }
  if (Number(o.hitsPerMinute) > 60) {
    risk += 30; reasons.push(`同一 IP 1 分钟内 ${o.hitsPerMinute} 次请求，疑似高频抓取`);
    if (ORDER.suspicious > ORDER[kind]) kind = 'suspicious';
  }
  if (!ua.trim()) {
    risk += 20; reasons.push('缺失 User-Agent');
    if (ORDER.suspicious > ORDER[kind]) kind = 'suspicious';
  }
  if (o.method && !['GET', 'POST', 'HEAD', 'OPTIONS'].includes(String(o.method).toUpperCase())) {
    risk += 20; reasons.push('非常规 HTTP 方法 ' + String(o.method).toUpperCase());
    if (ORDER.suspicious > ORDER[kind]) kind = 'suspicious';
  }
  if (o.scope === 'probe' && kind === 'human') { kind = 'probe'; reasons.push('平台健康探针路径'); }

  const meta = KINDS[kind];
  return {
    kind, botName, reasons, risk: Math.min(100, risk),
    label: meta.label, tone: meta.tone, severity: meta.severity
  };
}

/** 把存储里的原始记录补齐分类与来源字段（只读，不修改原对象） */
function enrich(doc, origin, siteHost) {
  const d = doc || {};
  const info = d.kind ? {
    kind: KINDS[d.kind] ? d.kind : 'human', botName: d.botName || '',
    reasons: Array.isArray(d.reasons) ? d.reasons : [], risk: Number(d.risk) || 0
  } : classify({
    path: d.path, url: d.url, userAgent: d.userAgent,
    method: d.method, hitsPerMinute: d.hitsPerMinute, scope: d.scope
  });
  const src = d.channel ? {
    channel: CHANNELS[d.channel] ? d.channel : 'unknown',
    sourceHost: d.sourceHost || '', sourceLabel: d.sourceLabel || '',
    engine: d.engine || '', campaign: d.campaign || '', medium: d.medium || '',
    term: d.term || '', landing: d.landing || d.path || '/',
    utmPresent: !!d.utmPresent
  } : parseSource({ referrer: d.referrer, url: d.url, utm: d.utm, siteHost, landing: d.landing || d.path });
  /* 历史记录校正：早期把本站另一个域名误记为「外部链接」的记录，按当前站内基准重新归类。
     只影响聚合展示，不改写存储里的原始日志。 */
  if (src.channel === 'referral' && isInternalHost(src.sourceHost, siteHost)) {
    src.channel = 'internal';
    src.sourceLabel = '站内跳转';
  }
  const meta = KINDS[info.kind];
  const time = new Date(d.timestamp || d.time || 0);
  return {
    origin: d.origin || origin || 'portfolio',
    ip: d.ip || '未知', time,
    path: d.path || '/', url: d.url || '', referrer: d.referrer || '',
    userAgent: d.userAgent || '', method: d.method || 'GET', status: d.status || 0,
    version: d.version || '', source: d.source || '',
    kind: info.kind, label: meta.label, tone: meta.tone, severity: meta.severity,
    botName: info.botName, reasons: info.reasons, risk: info.risk,
    channel: src.channel, channelLabel: CHANNELS[src.channel].label,
    sourceHost: src.sourceHost, sourceLabel: src.sourceLabel, engine: src.engine,
    campaign: src.campaign, medium: src.medium, term: src.term,
    landing: src.landing, utmPresent: src.utmPresent
  };
}

function dayKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function countBy(list, keyFn) {
  const m = new Map();
  list.forEach(x => { const k = keyFn(x); if (!k) return; m.set(k, (m.get(k) || 0) + 1); });
  return Array.from(m.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

/**
 * 汇总生成监测页数据。
 * @param {object} o { visits, requests, releases, siteHost, now }
 */
function summarize(o) {
  const now = o.now ? new Date(o.now) : new Date();
  const siteHost = o.siteHost || '';
  const visits = Array.isArray(o.visits) ? o.visits : [];
  const requests = Array.isArray(o.requests) ? o.requests : [];
  const releases = Array.isArray(o.releases) ? o.releases : [];
  const entries = visits.map(v => enrich(v, 'portfolio', siteHost))
    .concat(requests.map(r => enrich(r, 'admin', siteHost)))
    .filter(e => !isNaN(e.time.getTime()))
    .sort((a, b) => b.time - a.time);
  const total = entries.length;

  const kinds = {};
  Object.keys(KINDS).forEach(k => { kinds[k] = entries.filter(e => e.kind === k).length; });
  const threats = kinds.suspicious + kinds.attack;
  const robots = kinds.crawler + kinds.ai + kinds.bot;

  /* 真人来源分析：机器人不算「用户从哪进来」 */
  const humans = entries.filter(e => e.kind === 'human');
  const channels = Object.keys(CHANNELS).map(key => {
    const count = humans.filter(e => e.channel === key).length;
    return { key, label: CHANNELS[key].label, tone: CHANNELS[key].tone, desc: CHANNELS[key].desc,
      count, pct: humans.length ? Math.round(count / humans.length * 1000) / 10 : 0 };
  }).sort((a, b) => b.count - a.count);

  const sourceAgg = countBy(humans, e => e.sourceHost || (e.channel === 'direct' ? '' : e.sourceLabel));
  const sources = sourceAgg.slice(0, 8).map(s => {
    const sample = humans.find(e => (e.sourceHost || e.sourceLabel) === s.key) || {};
    return { host: s.key || '（无来源信息）', label: sample.sourceLabel || s.key,
      channel: sample.channelLabel || '', count: s.count,
      pct: humans.length ? Math.round(s.count / humans.length * 1000) / 10 : 0 };
  });
  const landings = countBy(humans, e => e.landing || e.path).slice(0, 8)
    .map(l => ({ path: l.key, count: l.count, pct: humans.length ? Math.round(l.count / humans.length * 1000) / 10 : 0 }));
  const campaigns = countBy(humans.filter(e => e.utmPresent), e => [e.medium, e.campaign, e.channelLabel].filter(Boolean).join(' · '))
    .slice(0, 6).map(c => ({ name: c.key, count: c.count }));
  const engines = countBy(humans.filter(e => e.engine), e => e.engine).slice(0, 6)
    .map(e => ({ name: e.key, count: e.count }));

  const bots = countBy(entries.filter(e => e.botName), e => e.botName)
    .map(b => {
      const sample = entries.find(e => e.botName === b.key) || {};
      return { name: b.key, count: b.count, kind: sample.kind, tone: sample.tone, label: sample.label };
    }).sort((a, b) => b.count - a.count).slice(0, 10);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, human: 0, robot: 0, threat: 0 });
  }
  const di = new Map(days.map((d, i) => [d.key, i]));
  entries.forEach(e => {
    const i = di.get(dayKey(e.time));
    if (i === undefined) return;
    if (e.kind === 'attack' || e.kind === 'suspicious') days[i].threat++;
    else if (e.kind === 'crawler' || e.kind === 'ai' || e.kind === 'bot') days[i].robot++;
    else days[i].human++;
  });
  const maxDay = Math.max(1, ...days.map(d => d.human + d.robot + d.threat));

  /* 版本迭代：发布记录 + 各版本实际上报量 */
  const vAgg = new Map();
  entries.filter(e => e.version).forEach(e => {
    const v = vAgg.get(e.version) || { version: e.version, visits: 0, first: e.time, last: e.time };
    v.visits++;
    if (e.time < v.first) v.first = e.time;
    if (e.time > v.last) v.last = e.time;
    vAgg.set(e.version, v);
  });
  const releasesOut = releases.slice().sort((a, b) => new Date(b.deployedAt) - new Date(a.deployedAt)).map((r, i) => {
    const stat = vAgg.get(r.version) || { visits: 0, first: null, last: null };
    return {
      version: r.version, note: r.note || '', commit: r.commit || '',
      deployedAt: new Date(r.deployedAt), source: r.source || 'api',
      visits: stat.visits, first: stat.first, last: stat.last, current: i === 0
    };
  });
  const knownVersions = new Set(releasesOut.map(r => r.version));
  const extraVersions = Array.from(vAgg.values()).filter(v => !knownVersions.has(v.version))
    .sort((a, b) => b.first - a.first).slice(0, 10);

  return {
    total, kinds, threats, robots, humans: kinds.human,
    channels, sources, landings, campaigns, engines, bots, days, maxDay,
    releases: releasesOut, extraVersions,
    currentVersion: releasesOut.length ? releasesOut[0].version : (extraVersions[0] && extraVersions[0].version) || '',
    threatRows: entries.filter(e => e.severity >= 2).slice(0, 60),
    botRows: entries.filter(e => e.botName && e.severity < 2).slice(0, 30),
    recentRows: entries.slice(0, 40),
    generatedAt: now
  };
}

/** /online 公开页用的安全概览：只有聚合数字，不含 IP / UA 明细 */
function publicOverview(summary) {
  return {
    total: summary.total, humans: summary.humans, robots: summary.robots,
    threats: summary.threats, attacks: summary.kinds.attack,
    currentVersion: summary.currentVersion,
    topChannel: summary.channels.filter(c => c.count > 0)[0] || null,
    lastRelease: summary.releases[0] || null,
    generatedAt: summary.generatedAt
  };
}

const RULE_CARDS = [
  { name: '已知爬虫', tone: 'info', detail: 'Googlebot / Bingbot / Baiduspider / 搜狗 / 360 / AI 大模型爬虫（GPTBot、ClaudeBot、PerplexityBot 等）按 UA 精确识别，单独归类，不混进真人流量。' },
  { name: '自动化工具', tone: 'muted', detail: 'curl、python-requests、Go-http-client、HeadlessChrome、Playwright 等非浏览器客户端标为「自动化工具」，并保留 UA 原文。' },
  { name: '路径扫描', tone: 'warn', detail: '探测 /.env、/.git、wp-admin、phpmyadmin、/actuator、备份文件等敏感路径标为「可疑请求」，在明细中列出命中原因。' },
  { name: '攻击尝试', tone: 'bad', detail: 'SQL 注入、XSS、路径穿越、Log4Shell、命令执行 payload 与 sqlmap / nikto / ffuf 等黑客工具 UA 直接标红为「攻击尝试」，并记录风险分。' },
  { name: '高频抓取', tone: 'warn', detail: '同一 IP 在 1 分钟内超过 60 次请求时自动升级为可疑，超出阈值的上报会被限流拒绝。' }
];

module.exports = {
  KINDS, CHANNELS, RULE_CARDS,
  classify, parseSource, enrich, summarize, publicOverview,
  hostOf, clip, siteHostList, isInternalHost
};
