/** Stage-ladder spaced repetition helpers (not FSRS). */

export type SrsStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface ItemStats {
  correct: number;
  wrong: number;
  currentCorrect: number;
  currentWrong: number;
  maxCorrect: number;
  maxWrong: number;
  stage: SrsStage;
  /** epoch ms; null = new card not yet introduced */
  dueAt: number | null;
  lastReviewedAt: number | null;
}

export const EMPTY_STATS: ItemStats = {
  correct: 0,
  wrong: 0,
  currentCorrect: 0,
  currentWrong: 0,
  maxCorrect: 0,
  maxWrong: 0,
  stage: 0,
  dueAt: null,
  lastReviewedAt: null,
};

export function emptyStats(): ItemStats {
  return { ...EMPTY_STATS };
}

/** Interval after answering correctly at the given stage (before bump). */
const CORRECT_INTERVAL_MS: Record<SrsStage, number> = {
  0: 10 * 60 * 1000, // → stage 1
  1: 1 * 24 * 60 * 60 * 1000, // → stage 2
  2: 3 * 24 * 60 * 60 * 1000, // → stage 3
  3: 7 * 24 * 60 * 60 * 1000, // → stage 4
  4: 16 * 24 * 60 * 60 * 1000, // → stage 5
  5: 30 * 24 * 60 * 60 * 1000, // stay at 5
};

export function stageLabel(stage: SrsStage): string {
  if (stage === 0) return "新卡";
  if (stage <= 2) return "学习中";
  if (stage <= 4) return "复习中";
  return "成熟";
}

export function clampStage(n: number): SrsStage {
  const v = Math.max(0, Math.min(5, Math.round(n)));
  return v as SrsStage;
}

export function isNewCard(stats: ItemStats): boolean {
  return stats.stage === 0 && stats.dueAt === null && stats.correct === 0 && stats.wrong === 0;
}

export function isDue(stats: ItemStats, now: number): boolean {
  if (stats.dueAt == null) return false;
  return stats.dueAt <= now;
}

/** Progress chart tone: idle | learning | review | mature | weak */
export function progressTone(stats: ItemStats): string {
  if (stats.currentWrong > 0 || (stats.wrong > stats.correct && stats.wrong > 0)) {
    return "weak";
  }
  if (isNewCard(stats) || (stats.stage === 0 && stats.correct === 0 && stats.wrong === 0)) {
    return "idle";
  }
  if (stats.stage >= 5) return "mature";
  if (stats.stage >= 3) return "review";
  return "learning";
}

export function applySrsGrade(prev: ItemStats, correct: boolean, now = Date.now()): ItemStats {
  if (correct) {
    const currentCorrect = prev.currentCorrect + 1;
    const nextStage = clampStage(Math.min(5, prev.stage + 1));
    // Interval is based on stage before answering for first promotion from 0,
    // and on the resulting stage's interval table keyed by previous stage.
    const interval = CORRECT_INTERVAL_MS[prev.stage];
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
  const nextStage = clampStage(Math.max(0, prev.stage - 2));
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

function mapLegacyStreakToStage(currentCorrect: number): SrsStage {
  if (currentCorrect <= 0) return 0;
  if (currentCorrect === 1) return 1;
  if (currentCorrect === 2) return 2;
  return 3;
}

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
      stage: clampStage(typeof raw.stage === "number" ? raw.stage : 0),
      dueAt: typeof raw.dueAt === "number" ? raw.dueAt : raw.dueAt === null ? null : null,
      lastReviewedAt:
        typeof raw.lastReviewedAt === "number"
          ? raw.lastReviewedAt
          : raw.lastReviewedAt === null
            ? null
            : null,
    };
  }

  // Legacy stats without SRS fields.
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

export function migrateStatsMap(
  existing: Record<string, Partial<ItemStats>>,
): Record<string, ItemStats> {
  const next: Record<string, ItemStats> = {};
  for (const [key, value] of Object.entries(existing)) {
    next[key] = normalizeItem(value as Partial<ItemStats> & Record<string, unknown>);
  }

  // Also pull legacy streaks key if stats was empty.
  if (Object.keys(next).length === 0) {
    try {
      const raw = localStorage.getItem("gojuuon-learning:streaks");
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
      // ignore
    }
  }

  return next;
}

export function formatDue(dueAt: number | null, now = Date.now()): string {
  if (dueAt == null) return "未开始";
  const delta = dueAt - now;
  if (delta <= 0) return "已到期";

  const minutes = Math.round(delta / (60 * 1000));
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟后`;

  const hours = Math.round(delta / (60 * 60 * 1000));
  if (hours < 48) return `${hours} 小时后`;

  const days = Math.round(delta / (24 * 60 * 60 * 1000));
  return `${days} 天后`;
}

export function localDateKey(now = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
