/**
 * 项目数据 — 来源于实习期间的真实交付物
 *
 * cover:  详情页头图（放 landscape 的图，避免 16/9 裁切丢内容）
 * images: 详情页图集，第一张与 cover 一致，其余按交付顺序排列
 *         精选项目网格会把所有项目的 images 拉平成 28 格，
 *         并自动取 images/work/thumbs/ 下的同名缩略图，
 *         所以这里只写全尺寸路径即可。
 */
import { asset } from "../utils/asset";

const rawProjects = [
  {
    id: "shengtian-ad-delivery",
    titleZh: "游戏广告 · 投放视觉",
    titleEn: "Game Ads · Delivery Visuals",
    cover: "/images/work/st-ad-01.jpg",
    tags: ["Ad Creative", "Marketing", "Game"],
    roleZh: "广告创意 / 品牌视觉",
    roleEn: "Ad Creative / Brand Visual",
    companyZh: "武汉盛天网络",
    companyEn: "Wuhan Shengtian Network",
    year: "2024",
    descZh:
      "面向信息流投放的游戏广告视觉，一个主题延展成多版画面，配合投放节奏快速上线。重点是在极短的曝光时间里把卖点排到第一眼位置，标题、主体与按钮各自守住自己的层级。",
    descEn:
      "Feed-facing game ad creative where one theme fans out into multiple variants to match media-buying pace. The work is about getting the hook into the first glance — headline, subject and CTA each holding their own level of hierarchy.",
    tools: ["Photoshop", "Illustrator", "After Effects"],
    images: [
      "/images/work/st-ad-01.jpg",
      "/images/work/st-ad-02.jpg",
      "/images/work/st-ad-03.jpg",
      "/images/work/st-ad-04.jpg",
      "/images/work/st-ad-05.jpg",
      "/images/work/st-ad-06.jpg",
      "/images/work/st-ad-07.jpg",
    ],
  },
  {
    id: "shengtian-original",
    titleZh: "原创广告素材",
    titleEn: "Original Ad Creative",
    cover: "/images/work/st-original-01.jpg",
    tags: ["Original", "Ad Creative", "Illustration"],
    roleZh: "广告创意 / 视觉设计",
    roleEn: "Ad Creative / Visual Design",
    companyZh: "武汉盛天网络",
    companyEn: "Wuhan Shengtian Network",
    year: "2024",
    descZh:
      "从概念草图做到成稿的原创投放素材，按周为不同项目产出画面。不套模板，每一版都重新想构图与情绪，再回到统一的版式与字体层级上收口。",
    descEn:
      "Original campaign assets taken from concept sketch to final artwork, shipped weekly across different titles. No template reuse — each round rethinks composition and mood, then lands back on a shared layout and type hierarchy.",
    tools: ["Photoshop", "Illustrator"],
    images: [
      "/images/work/st-original-01.jpg",
      "/images/work/st-original-02.jpg",
      "/images/work/st-original-03.jpg",
      "/images/work/st-original-04.jpg",
    ],
  },
  {
    id: "weipai-broadcast",
    titleZh: "全服播报视觉",
    titleEn: "Global Broadcast Banners",
    cover: "/images/work/wp-broadcast-01.png",
    tags: ["Game UI", "In-game Asset", "Typography"],
    roleZh: "UI / 视觉设计实习生",
    roleEn: "UI / Visual Design Intern",
    companyZh: "武汉微派网络科技",
    companyEn: "Wuhan Weipai Network",
    year: "2024",
    descZh:
      "《贪吃蛇大作战》的全服播报条与播报秀底板。播报是会盖在战斗画面上的窄条，所以要在很扁的比例里同时做到显眼、可读、以及不遮挡玩家视野，稀有度靠底板与光效分级。",
    descEn:
      "Global broadcast bars and show plates for Snake Battle. Broadcasts overlay live gameplay, so an extremely wide, shallow ratio has to stay loud, legible and non-obstructive at once — rarity is graded through plate and glow treatment.",
    tools: ["Photoshop", "Illustrator"],
    images: [
      "/images/work/wp-broadcast-01.png",
      "/images/work/wp-broadcast-02.png",
      "/images/work/wp-broadcast-03.png",
    ],
  },
  {
    id: "weipai-gift-starfish",
    titleZh: "礼物设计 · 欢快小海星",
    titleEn: "Gift Design · Cheerful Starfish",
    cover: "/images/work/wp-starfish-01.jpg",
    tags: ["Game Asset", "Character", "Gift"],
    roleZh: "UI / 视觉设计实习生",
    roleEn: "UI / Visual Design Intern",
    companyZh: "武汉微派网络科技",
    companyEn: "Wuhan Weipai Network",
    year: "2024",
    descZh:
      "面向社交场景的礼物形象设计。造型要在很小的尺寸下仍能一眼认出轮廓与情绪，所以先把剪影做对，再补细节与配色，最后输出可复用的展示与预览规格。",
    descEn:
      "Gift artwork for social scenarios. The silhouette has to read at icon size before anything else, so shape and expression came first, then detail and palette, then reusable display and preview specs.",
    tools: ["Photoshop", "Illustrator"],
    images: [
      "/images/work/wp-starfish-01.jpg",
      "/images/work/wp-starfish-02.png",
    ],
  },
  {
    id: "weipai-apple-cards",
    titleZh: "Apple 活动卡片",
    titleEn: "Apple Campaign Cards",
    cover: "/images/work/wp-apple-may-h.jpg",
    tags: ["Campaign", "Key Visual", "Multi-platform"],
    roleZh: "UI / 视觉设计实习生",
    roleEn: "UI / Visual Design Intern",
    companyZh: "武汉微派网络科技",
    companyEn: "Wuhan Weipai Network",
    year: "2024",
    descZh:
      "节点活动的卡片主视觉，横版与竖版成对交付。同一套画面要同时活在两种极端比例里，做法是先定主体与留白的相对关系，再按版式重排信息，而不是把横版直接裁成竖版。",
    descEn:
      "Seasonal campaign key visuals delivered as landscape and portrait pairs. One idea has to live in two extreme ratios, so the subject-to-negative-space relationship is fixed first and information is re-laid out per format instead of cropping one into the other.",
    tools: ["Photoshop", "Illustrator"],
    images: [
      "/images/work/wp-apple-may-h.jpg",
      "/images/work/wp-apple-may-v.jpg",
      "/images/work/wp-apple-dragonboat.jpg",
      "/images/work/wp-apple-onmyoji-01.jpg",
      "/images/work/wp-apple-onmyoji-02.jpg",
    ],
  },
  {
    id: "weipai-channel-assets",
    titleZh: "渠道推广物料",
    titleEn: "Channel Promotion Assets",
    cover: "/images/work/wp-oppo-popup-01.jpg",
    tags: ["Channel", "Marketing", "Adaptation"],
    roleZh: "UI / 视觉设计实习生",
    roleEn: "UI / Visual Design Intern",
    companyZh: "武汉微派网络科技",
    companyEn: "Wuhan Weipai Network",
    year: "2024",
    descZh:
      "OPPO 游戏助手拍脸弹窗与华为智能短信等渠道物料。每个渠道有自己的安全区、字数与审核口径，所以这类交付一半是视觉，一半是把规范吃透后仍然把画面做好看。",
    descEn:
      "Channel assets including the OPPO game-assistant splash popup and Huawei smart-message placements. Every channel brings its own safe area, copy limit and review rules — half the job is visual, half is keeping the frame good-looking inside those constraints.",
    tools: ["Photoshop", "Illustrator"],
    images: [
      "/images/work/wp-oppo-popup-01.jpg",
      "/images/work/wp-oppo-popup-02.png",
      "/images/work/wp-huawei-sms.jpg",
    ],
  },
  {
    id: "weipai-bp-store",
    titleZh: "BP 活动 · 商店皮肤展示",
    titleEn: "Battle Pass · Store Showcase",
    cover: "/images/work/wp-bp-30-01.png",
    tags: ["Game UI", "Store", "Design System"],
    roleZh: "UI / 视觉设计实习生",
    roleEn: "UI / Visual Design Intern",
    companyZh: "武汉微派网络科技",
    companyEn: "Wuhan Weipai Network",
    year: "2024",
    descZh:
      "BP 活动的商店展示与皮肤资源切图，分 12 元与 30 元两档。两档共用一套结构，只靠底板、材质与光效的档位差把价值感拉开，同时保证切图能直接进工程复用。",
    descEn:
      "Battle-pass store showcase and skin assets across two price tiers. Both tiers share one structure and separate on plate, material and glow treatment, while the exported slices drop straight into the build.",
    tools: ["Photoshop", "Illustrator"],
    images: [
      "/images/work/wp-bp-30-01.png",
      "/images/work/wp-bp-30-02.png",
      "/images/work/wp-bp-12-01.png",
      "/images/work/wp-bp-12-02.png",
    ],
  },
];

/** 统一给 public/ 资源补上 BASE_URL，便于部署到子路径 */
export const projects = rawProjects.map((project) => ({
  ...project,
  cover: asset(project.cover),
  images: project.images.map(asset),
}));

/**
 * 精选项目网格用的 28 格。
 * 轮转取图：每轮从各项目各取一张，让相邻格子来自不同项目 ——
 * 网格四行错向移动，同一项目挤在一起会看成一块色块。
 */
export const featuredGridSlots = (() => {
  const queues = projects.map((project) => project.images.map((src) => ({ project, src })));
  const slots = [];
  let round = 0;
  while (slots.length < queues.reduce((sum, queue) => sum + queue.length, 0)) {
    let placed = false;
    for (const queue of queues) {
      if (round < queue.length) {
        slots.push(queue[round]);
        placed = true;
      }
    }
    if (!placed) break;
    round += 1;
  }
  return slots;
})();

/** 全尺寸图 → 同名缩略图（网格只需要缩略图，避免首屏拉 20MB） */
export const thumbFor = (src) => src.replace("images/work/", "images/work/thumbs/");
