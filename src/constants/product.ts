/**
 * 产品相关的具名常量（间隔重复、练习会话、本地存储、画板与界面时序）。
 * 数据表（五十音、笔顺映射、图表布局）仍放在 `src/data/`，此处只收「规则数字 / 键名」。
 */

/** localStorage 键前缀 */
export const 本地存储前缀 = "gojuuon-learning:";

/** 当前使用的持久化键名（不含前缀） */
export const 存储键 = {
  设置: "settings",
  统计: "stats",
  当前假名Id: "currentEntryId",
  当前字体列表: "currentScripts",
  会话: "session",
} as const;

/** 旧版键名（迁移 / 重置时清理） */
export const 旧版存储键 = {
  连对: "streaks",
  随机队列: "randomQueue",
  顺序下标: "sequentialIndex",
} as const;

/** SRS 阶段：0 新卡 → 5 成熟 */
export const Srs阶段 = {
  新卡: 0,
  学习上限: 2,
  复习起点: 3,
  复习上限: 4,
  成熟: 5,
  最大值: 5,
} as const;

/** 答错时阶段回退档数 */
export const 答错阶段回退 = 2;

/** 时间单位（毫秒），供间隔表与展示换算 */
export const 毫秒 = {
  每分钟: 60 * 1000,
  每小时: 60 * 60 * 1000,
  每天: 24 * 60 * 60 * 1000,
} as const;

/**
 * 答对后的间隔（按「答题前」阶段取值，再升一档）。
 * 0→10 分钟，1→1 天，2→3 天，3→7 天，4→16 天，5→30 天见顶。
 */
export const 答对间隔毫秒 = {
  [Srs阶段.新卡]: 10 * 毫秒.每分钟,
  1: 1 * 毫秒.每天,
  2: 3 * 毫秒.每天,
  3: 7 * 毫秒.每天,
  4: 16 * 毫秒.每天,
  [Srs阶段.成熟]: 30 * 毫秒.每天,
} as const;

/** 到期文案：不足一小时用「分钟」，不足两天用「小时」 */
export const 到期展示阈值 = {
  分钟改小时: 60,
  小时改天: 48,
} as const;

/** 每日新卡数量上下限与默认值 */
export const 每日新卡 = {
  默认: 10,
  最小: 1,
  最大: 40,
} as const;

/** 答错后至少再过多少张卡才允许再次出现 */
export const 答错再入队间隔张数 = 3;

/** 取下一题时的防死循环上限 */
export const 取题循环保护次数 = 5000;

/** 自评全部完成后自动进入下一题的延迟 */
export const 自评后自动下一题毫秒 = 320;

/** 空闲时预热全部清音笔顺 GIF */
export const 笔顺预热 = {
  空闲超时毫秒: 4000,
  降级延迟毫秒: 1200,
} as const;

/** 画板绘制相关 */
export const 画板 = {
  /** devicePixelRatio 上限，避免超大位图 */
  最大设备像素比: 3,
  /** 普通线宽（CSS 像素） */
  线宽普通: 4,
  /** 双栏紧凑线宽 */
  线宽紧凑: 3.2,
  /** 田字格辅助线边距 */
  辅助线边距: 12,
  /** 辅助线虚线样式 */
  辅助线虚线: [6, 6] as const,
  /** 辅助线线宽 */
  辅助线线宽: 1,
  /** 笔迹颜色 */
  笔迹颜色: "#1a2332",
  /** 导出快照 MIME */
  快照格式: "image/png",
  /** 平假名辅助线色 */
  平假名辅助线: "rgba(140, 96, 48, 0.22)",
  /** 片假名辅助线色 */
  片假名辅助线: "rgba(40, 96, 120, 0.22)",
  /** 认为尺寸有效的最小边长 */
  最小有效边长: 2,
} as const;

/** 进度图中的色调标识（与 CSS data-tone 对应） */
export const 进度色调 = {
  未练: "idle",
  学习中: "learning",
  复习中: "review",
  成熟: "mature",
  易错: "weak",
} as const;

/** 默认练习设置（产品默认值） */
export const 默认练习设置 = {
  scriptMode: "both" as const,
  orderMode: "sequential" as const,
  newCardsPerDay: 每日新卡.默认,
  enabledGroups: ["seion", "dakuon", "handakuon", "youon"] as const,
};

/** 全部假名分组（设置面板勾选顺序） */
export const 全部假名分组 = ["seion", "dakuon", "handakuon", "youon"] as const;

/** 分组中文标签 */
export const 假名分组标签 = {
  seion: "清音",
  dakuon: "浊音",
  handakuon: "半浊音",
  youon: "拗音",
} as const;

/** 笔顺资源相对 public 的目录名 */
export const 笔顺资源目录 = "strokes";
