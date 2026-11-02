/**
 * 阶段阶梯式间隔重复（非 FSRS）的统计与排程辅助。
 */
import {
  Srs阶段,
  到期展示阈值,
  答对间隔毫秒,
  答错阶段回退,
  旧版存储键,
  本地存储前缀,
  毫秒,
  进度色调,
} from "@/constants/product";

/** SRS 阶段字面量类型：0 新卡 … 5 成熟 */
export type SrsStage = 0 | 1 | 2 | 3 | 4 | 5;

/** 单个「假名 × 字体」的练习统计与排程字段 */
export interface ItemStats {
  correct: number;
  wrong: number;
  currentCorrect: number;
  currentWrong: number;
  maxCorrect: number;
  maxWrong: number;
  stage: SrsStage;
  /** 下次到期的 epoch 毫秒；null 表示尚未引入的新卡 */
  dueAt: number | null;
  lastReviewedAt: number | null;
}

/** 空统计模板（新卡初始态） */
export const EMPTY_STATS: ItemStats = {
  correct: 0,
  wrong: 0,
  currentCorrect: 0,
  currentWrong: 0,
  maxCorrect: 0,
  maxWrong: 0,
  stage: Srs阶段.新卡,
  dueAt: null,
  lastReviewedAt: null,
};

/**
 * 复制一份空的统计对象。
 * @returns 独立的空 {@link ItemStats}
 * @副作用 无
 */
export function emptyStats(): ItemStats {
  return { ...EMPTY_STATS };
}

/**
 * 将阶段编号转为界面展示文案。
 * @param stage - SRS 阶段 0–5
 * @returns 「新卡」/「学习中」/「复习中」/「成熟」
 * @副作用 无
 */
export function stageLabel(stage: SrsStage): string {
  if (stage === Srs阶段.新卡) return "新卡";
  if (stage <= Srs阶段.学习上限) return "学习中";
  if (stage <= Srs阶段.复习上限) return "复习中";
  return "成熟";
}

/**
 * 将任意数字钳制到合法 SRS 阶段。
 * @param n - 原始数值
 * @returns 0–5 的整数阶段
 * @副作用 无
 */
export function clampStage(n: number): SrsStage {
  const v = Math.max(Srs阶段.新卡, Math.min(Srs阶段.最大值, Math.round(n)));
  return v as SrsStage;
}

/**
 * 判断是否为从未练过的新卡。
 * @param stats - 条目统计
 * @returns 是否为新卡
 * @副作用 无
 */
export function isNewCard(stats: ItemStats): boolean {
  return (
    stats.stage === Srs阶段.新卡 && stats.dueAt === null && stats.correct === 0 && stats.wrong === 0
  );
}

/**
 * 判断当前时刻是否已到期（含「今日刚引入、待首次作答」的卡）。
 * @param stats - 条目统计
 * @param now - 当前 epoch 毫秒
 * @returns 是否到期
 * @副作用 无
 */
export function isDue(stats: ItemStats, now: number): boolean {
  if (stats.dueAt == null) return false;
  return stats.dueAt <= now;
}

/**
 * 判断是否为今日额度引入、尚未批改的待练卡（计入重建队列，但不算「到期复习」）。
 * @param stats - 条目统计
 * @returns 是否为引入待批改
 * @副作用 无
 */
export function isIntroducedPending(stats: ItemStats): boolean {
  return (
    stats.stage === Srs阶段.新卡 &&
    stats.dueAt != null &&
    stats.correct === 0 &&
    stats.wrong === 0 &&
    stats.lastReviewedAt == null
  );
}

/**
 * 是否应在「到期」计数 / 空状态中展示为复习到期（排除仅占用今日新卡名额者）。
 * @param stats - 条目统计
 * @param now - 当前 epoch 毫秒
 * @returns 是否为复习到期
 * @副作用 无
 */
export function isReviewDue(stats: ItemStats, now: number): boolean {
  return isDue(stats, now) && !isIntroducedPending(stats);
}

/**
 * 进度图色调：未练 / 学习中 / 复习中 / 成熟 / 易错。
 * @param stats - 条目统计
 * @returns 与 CSS `data-tone` 对应的字符串
 * @副作用 无
 */
export function progressTone(stats: ItemStats): string {
  if (stats.currentWrong > 0 || (stats.wrong > stats.correct && stats.wrong > 0)) {
    return 进度色调.易错;
  }
  if (
    isNewCard(stats) ||
    (stats.stage === Srs阶段.新卡 && stats.correct === 0 && stats.wrong === 0)
  ) {
    return 进度色调.未练;
  }
  if (stats.stage >= Srs阶段.成熟) return 进度色调.成熟;
  if (stats.stage >= Srs阶段.复习起点) return 进度色调.复习中;
  return 进度色调.学习中;
}

/**
 * 根据自评结果更新统计并计算下次到期时间。
 * @param prev - 答题前的统计
 * @param correct - 是否自评正确
 * @param now - 批改时刻（默认当前时间）
 * @returns 更新后的统计（含新阶段与 dueAt）
 * @副作用 无（调用方负责写回存储）
 */
export function applySrsGrade(prev: ItemStats, correct: boolean, now = Date.now()): ItemStats {
  if (correct) {
    const currentCorrect = prev.currentCorrect + 1;
    const nextStage = clampStage(Math.min(Srs阶段.最大值, prev.stage + 1));
    const interval = 答对间隔毫秒[prev.stage as keyof typeof 答对间隔毫秒];
    return {
      correct: prev.correct + 1,
      wrong: prev.wrong,
      currentCorrect,
      currentWrong: 0,
      maxCorrect: Math.max(prev.maxCorrect, currentCorrect),
      maxWrong: prev.maxWrong,
      stage: nextStage,
      dueAt: now + interval,
      lastReviewedAt: now,
    };
  }

  const currentWrong = prev.currentWrong + 1;
  const nextStage = clampStage(Math.max(Srs阶段.新卡, prev.stage - 答错阶段回退));
  return {
    correct: prev.correct,
    wrong: prev.wrong + 1,
    currentCorrect: 0,
    currentWrong,
    maxCorrect: prev.maxCorrect,
    maxWrong: Math.max(prev.maxWrong, currentWrong),
    stage: nextStage,
    dueAt: now,
    lastReviewedAt: now,
  };
}

/**
 * 将旧版「连对次数」映射为大致 SRS 阶段（迁移用）。
 * @param currentCorrect - 旧版当前连对
 * @returns 推断的阶段
 * @副作用 无
 */
function mapLegacyStreakToStage(currentCorrect: number): SrsStage {
  if (currentCorrect <= 0) return Srs阶段.新卡;
  if (currentCorrect === 1) return 1;
  if (currentCorrect === 2) return 2;
  return Srs阶段.复习起点;
}

/**
 * 规范化单条统计（兼容缺字段的旧数据）。
 * @param raw - 可能不完整的原始对象
 * @returns 完整 {@link ItemStats}
 * @副作用 无
 */
function normalizeItem(raw: Partial<ItemStats> & Record<string, unknown>): ItemStats {
  const base = emptyStats();
  const correct = typeof raw.correct === "number" ? raw.correct : base.correct;
  const wrong = typeof raw.wrong === "number" ? raw.wrong : base.wrong;
  const currentCorrect =
    typeof raw.currentCorrect === "number" ? raw.currentCorrect : base.currentCorrect;
  const currentWrong = typeof raw.currentWrong === "number" ? raw.currentWrong : base.currentWrong;
  const maxCorrect = typeof raw.maxCorrect === "number" ? raw.maxCorrect : base.maxCorrect;
  const maxWrong = typeof raw.maxWrong === "number" ? raw.maxWrong : base.maxWrong;

  const hasSrs = "stage" in raw || "dueAt" in raw || "lastReviewedAt" in raw;
  if (hasSrs) {
    return {
      correct,
      wrong,
      currentCorrect,
      currentWrong,
      maxCorrect,
      maxWrong,
      stage: clampStage(typeof raw.stage === "number" ? raw.stage : Srs阶段.新卡),
      dueAt: typeof raw.dueAt === "number" ? raw.dueAt : raw.dueAt === null ? null : null,
      lastReviewedAt:
        typeof raw.lastReviewedAt === "number"
          ? raw.lastReviewedAt
          : raw.lastReviewedAt === null
            ? null
            : null,
    };
  }

  // 无 SRS 字段的旧版统计
  const practiced = correct > 0 || wrong > 0 || currentCorrect > 0;
  if (!practiced) return emptyStats();

  const stage = mapLegacyStreakToStage(currentCorrect);
  return {
    correct: Math.max(correct, currentCorrect),
    wrong,
    currentCorrect,
    currentWrong,
    maxCorrect: Math.max(maxCorrect, currentCorrect),
    maxWrong,
    stage,
    dueAt: Date.now(),
    lastReviewedAt: null,
  };
}

/**
 * 迁移整表统计；若为空则尝试读取旧版连对键。
 * @param existing - 当前 stats 映射
 * @returns 规范化后的完整映射
 * @副作用 可能读取 localStorage 旧键 `streaks`（只读）
 */
export function migrateStatsMap(
  existing: Record<string, Partial<ItemStats>>,
): Record<string, ItemStats> {
  const next: Record<string, ItemStats> = {};
  for (const [key, value] of Object.entries(existing)) {
    next[key] = normalizeItem(value as Partial<ItemStats> & Record<string, unknown>);
  }

  if (Object.keys(next).length === 0) {
    try {
      const raw = localStorage.getItem(`${本地存储前缀}${旧版存储键.连对}`);
      if (raw) {
        const legacy = JSON.parse(raw) as Record<string, number>;
        for (const [key, value] of Object.entries(legacy)) {
          const n = typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
          if (n <= 0) continue;
          next[key] = normalizeItem({
            correct: n,
            currentCorrect: n,
            maxCorrect: n,
          });
        }
      }
    } catch {
      // 忽略损坏的旧数据
    }
  }

  return next;
}

/**
 * 将到期时间格式化为简短中文相对时间。
 * @param dueAt - 到期 epoch；null 表示未开始
 * @param now - 当前时间
 * @returns 如「已到期」「3 分钟后」「2 小时后」「5 天后」
 * @副作用 无
 */
export function formatDue(dueAt: number | null, now = Date.now()): string {
  if (dueAt == null) return "未开始";
  const delta = dueAt - now;
  if (delta <= 0) return "已到期";

  const minutes = Math.round(delta / 毫秒.每分钟);
  if (minutes < 到期展示阈值.分钟改小时) return `${Math.max(1, minutes)} 分钟后`;

  const hours = Math.round(delta / 毫秒.每小时);
  if (hours < 到期展示阈值.小时改天) return `${hours} 小时后`;

  const days = Math.round(delta / 毫秒.每天);
  return `${days} 天后`;
}

/**
 * 生成本地日历日键（YYYY-MM-DD），用于每日新卡额度切日。
 * @param now - 当前 epoch 毫秒
 * @returns 本地日期字符串
 * @副作用 无
 */
export function localDateKey(now = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
