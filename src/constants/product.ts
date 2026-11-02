/**
 * 产品相关的具名常量（间隔重复、练习会话、本地存储、画板与界面时序）。
 * 数据表（五十音、笔顺映射、图表布局）仍放在 `src/data/`；此处只收规则数字与键名。
 * 标识符为英文；本文件注释为简体中文。
 */

/** localStorage 键前缀 */
export const STORAGE_PREFIX = "gojuuon-learning:";

/** 当前使用的持久化键名（不含前缀） */
export const STORAGE_KEYS = {
  settings: "settings",
  stats: "stats",
  currentEntryId: "currentEntryId",
  currentScript: "currentScript",
  session: "session",
} as const;

/** 旧版键名（重置时清理；`currentScripts` 启动时迁到 `currentScript`） */
export const LEGACY_STORAGE_KEYS = {
  randomQueue: "randomQueue",
  sequentialIndex: "sequentialIndex",
  /** 曾存 `ScriptKind[]`，现已改为单值 `currentScript` */
  currentScripts: "currentScripts",
} as const;

/** SRS 阶段地标：0 新卡 → 5 成熟 */
export const SrsStageLevel = {
  NEW: 0,
  LEARNING_MAX: 2,
  REVIEW_MIN: 3,
  REVIEW_MAX: 4,
  MATURE: 5,
  MAX: 5,
} as const;

/** 答错时阶段回退档数 */
export const WRONG_STAGE_PENALTY = 2;

/** 时间单位（毫秒） */
export const MS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * 答对后的间隔（按答题前阶段取值，再升一档）。
 * 0→10 分钟，1→1 天，2→3 天，3→7 天，4→16 天，5→30 天见顶。
 */
export const CORRECT_INTERVAL_MS = {
  [SrsStageLevel.NEW]: 10 * MS.MINUTE,
  1: 1 * MS.DAY,
  2: 3 * MS.DAY,
  3: 7 * MS.DAY,
  4: 16 * MS.DAY,
  [SrsStageLevel.MATURE]: 30 * MS.DAY,
} as const;

/** 到期文案阈值：不足一小时用「分钟」，不足两天用「小时」 */
export const DUE_LABEL_THRESHOLDS = {
  minutesBeforeHours: 60,
  hoursBeforeDays: 48,
} as const;

/** 每日新卡数量：默认 / 最小 / 最大 */
export const NEW_CARDS_PER_DAY = {
  default: 10,
  min: 1,
  max: 40,
} as const;

/** 答错后至少再过多少张卡才允许再次出现 */
export const WRONG_REQUEUE_GAP = 3;

/** 取下一题时的防死循环上限 */
export const TAKE_ROUND_GUARD_LIMIT = 5000;

/** 自评全部完成后自动进入下一题的延迟（毫秒） */
export const AUTO_ADVANCE_AFTER_GRADE_MS = 320;

/** 空闲时预热全部清音笔顺 GIF */
export const STROKE_PREFETCH = {
  idleTimeoutMs: 4000,
  fallbackDelayMs: 1200,
} as const;

/** 画板绘制相关 */
export const CANVAS = {
  /** devicePixelRatio 上限，避免超大位图 */
  maxDevicePixelRatio: 3,
  /** 普通线宽（CSS 像素） */
  lineWidthNormal: 4,
  /** 田字格辅助线边距 */
  guideInset: 12,
  /** 辅助线虚线样式 */
  guideDash: [6, 6] as const,
  /** 辅助线线宽 */
  guideLineWidth: 1,
  /** 笔迹颜色 */
  inkColor: "#1a2332",
  /** 导出快照 MIME */
  snapshotMime: "image/png",
  /** 平假名辅助线色 */
  hiraganaGuide: "rgba(140, 96, 48, 0.22)",
  /** 片假名辅助线色 */
  katakanaGuide: "rgba(40, 96, 120, 0.22)",
  /** 认为尺寸有效的最小边长 */
  minValidSize: 2,
} as const;

/** 进度图色调（与 CSS data-tone 对应） */
export const PROGRESS_TONE = {
  idle: "idle",
  learning: "learning",
  review: "review",
  mature: "mature",
  weak: "weak",
} as const;

/** 默认练习设置 */
export const DEFAULT_PRACTICE_SETTINGS = {
  scriptMode: "both" as const,
  orderMode: "sequential" as const,
  newCardsPerDay: NEW_CARDS_PER_DAY.default,
  enabledGroups: ["seion", "dakuon", "handakuon", "youon"] as const,
};

/** 全部假名分组（设置面板勾选顺序） */
export const ALL_KANA_GROUPS = ["seion", "dakuon", "handakuon", "youon"] as const;

/** 分组界面文案（简体中文 UI） */
export const KANA_GROUP_LABELS = {
  seion: "清音",
  dakuon: "浊音",
  handakuon: "半浊音",
  youon: "拗音",
} as const;

/** 笔顺资源相对 public 的目录名 */
export const STROKE_ASSET_DIR = "strokes";
