import { computed, ref, watch } from "vue";
import {
  DEFAULT_PRACTICE_SETTINGS,
  LEGACY_STORAGE_KEYS,
  NEW_CARDS_PER_DAY,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  SrsStageLevel,
  TAKE_ROUND_GUARD_LIMIT,
  WRONG_REQUEUE_GAP,
} from "@/constants/product";
import {
  GOJUUON,
  kanaGlyph,
  type KanaEntry,
  type KanaGroup,
  type ScriptKind,
} from "@/data/gojuuon";
import {
  applySrsGrade,
  emptyStats,
  formatDue,
  isDue,
  isNewCard,
  isReviewDue,
  localDateKey,
  migrateStatsMap,
  progressTone,
  stageLabel,
  type ItemStats,
} from "./srs";
import { useStorage } from "./useStorage";

export type ScriptMode = "hiragana" | "katakana" | "both";
export type OrderMode = "sequential" | "random";

/** 练习全局设置 */
export interface PracticeSettings {
  scriptMode: ScriptMode;
  orderMode: OrderMode;
  newCardsPerDay: number;
  enabledGroups: KanaGroup[];
}

/** 一轮练习：单一假名条目 × 一种字体 */
export interface PracticeRound {
  entry: KanaEntry;
  script: ScriptKind;
}

/** 进度面板一行数据 */
export interface ProgressRow {
  key: string;
  entryId: string;
  script: ScriptKind;
  kana: string;
  romaji: string;
  group: KanaGroup;
  order: number;
  stats: ItemStats;
  /** stage 已达成熟；到期仍会复习 */
  mastered: boolean;
  tone: string;
  stageLabel: string;
  dueLabel: string;
}

/** 当日会话快照（队列、新卡额度、答错暂避） */
export interface SessionSnapshot {
  /** 剩余卡片键 `entryId:script` */
  queue: string[];
  date: string;
  newIntroduced: number;
  reviewedCount: number;
  /** 在 reviewedCount 达到该值之前不再展示该键（答错间隔） */
  buryUntil: Record<string, number>;
}

const DEFAULT_SETTINGS: PracticeSettings = {
  scriptMode: DEFAULT_PRACTICE_SETTINGS.scriptMode,
  orderMode: DEFAULT_PRACTICE_SETTINGS.orderMode,
  newCardsPerDay: DEFAULT_PRACTICE_SETTINGS.newCardsPerDay,
  enabledGroups: [...DEFAULT_PRACTICE_SETTINGS.enabledGroups],
};

const EMPTY_SESSION: SessionSnapshot = {
  queue: [],
  date: "",
  newIntroduced: 0,
  reviewedCount: 0,
  buryUntil: {},
};

/**
 * 拼装卡片键：`假名Id:字体`。
 * @param entryId - 假名条目 id
 * @param script - 平假名或片假名
 * @returns 唯一键字符串
 * @副作用 无
 */
function itemKey(entryId: string, script: ScriptKind): string {
  return `${entryId}:${script}`;
}

/**
 * 解析卡片键。
 * @param key - `entryId:script` 形式
 * @returns 解析结果；非法时返回 null
 * @副作用 无
 */
function parseItemKey(key: string): { entryId: string; script: ScriptKind } | null {
  const idx = key.lastIndexOf(":");
  if (idx < 0) return null;
  const entryId = key.slice(0, idx);
  const script = key.slice(idx + 1);
  if (script !== "hiragana" && script !== "katakana") return null;
  return { entryId, script };
}

/**
 * 根据练习模式展开需要练习的字体列表（「两者」时各出各的卡）。
 * @param mode - 平 / 片 / 两者
 * @returns 字体数组
 * @副作用 无
 */
function scriptsForMode(mode: ScriptMode): ScriptKind[] {
  if (mode === "hiragana") return ["hiragana"];
  if (mode === "katakana") return ["katakana"];
  return ["hiragana", "katakana"];
}

/**
 * 将未知值规范为合法字体；兼容旧版 `ScriptKind[]` 持久化。
 * @param raw - 原始值
 * @returns 字体或 null
 * @副作用 无
 */
function coerceScript(raw: unknown): ScriptKind | null {
  if (raw === "hiragana" || raw === "katakana") return raw;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item === "hiragana" || item === "katakana") return item;
    }
  }
  return null;
}

/**
 * 字体中文标签。
 * @param script - 字体种类
 * @returns 「平假名」或「片假名」
 * @副作用 无
 */
function scriptLabel(script: ScriptKind): string {
  return script === "hiragana" ? "平假名" : "片假名";
}

/**
 * 合并并钳制设置（兼容旧字段 hideAfterCorrect）。
 * @param value - 原始或部分设置
 * @returns 合法的完整设置
 * @副作用 无
 */
function mergeSettings(value: PracticeSettings & { hideAfterCorrect?: number }): PracticeSettings {
  const groups = value.enabledGroups?.length ? value.enabledGroups : DEFAULT_SETTINGS.enabledGroups;
  const rawNew =
    typeof value.newCardsPerDay === "number"
      ? value.newCardsPerDay
      : DEFAULT_SETTINGS.newCardsPerDay;
  return {
    scriptMode: value.scriptMode ?? DEFAULT_SETTINGS.scriptMode,
    orderMode: value.orderMode ?? DEFAULT_SETTINGS.orderMode,
    newCardsPerDay: Math.min(
      NEW_CARDS_PER_DAY.max,
      Math.max(NEW_CARDS_PER_DAY.min, Math.round(rawNew)),
    ),
    enabledGroups: groups,
  };
}

/**
 * Fisher–Yates 原地洗牌。
 * @typeParam T - 元素类型
 * @param items - 将被打乱的数组
 * @returns 同一数组引用
 * @副作用 原地修改 `items`
 */
function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/**
 * 按五十音序比较两张卡片键（同序时平假名优先）。
 * @param a - 卡片键 A
 * @param b - 卡片键 B
 * @param entryById - 条目索引
 * @returns 比较结果（负 / 0 / 正）
 * @副作用 无
 */
function compareCardKeys(a: string, b: string, entryById: Map<string, KanaEntry>): number {
  const pa = parseItemKey(a);
  const pb = parseItemKey(b);
  if (!pa || !pb) return a.localeCompare(b);
  const ea = entryById.get(pa.entryId);
  const eb = entryById.get(pb.entryId);
  const oa = ea?.order ?? 0;
  const ob = eb?.order ?? 0;
  if (oa !== ob) return oa - ob;
  if (pa.script === pb.script) return 0;
  return pa.script === "hiragana" ? -1 : 1;
}

/**
 * 练习会话核心：题库队列、间隔重复批改、设置与进度行。
 * @returns 供界面绑定的状态与方法
 * @副作用 读写 localStorage（经 useStorage）；迁移旧统计键
 */
export function usePractice() {
  const settings = useStorage<PracticeSettings>(STORAGE_KEYS.settings, { ...DEFAULT_SETTINGS });
  const stats = useStorage<Record<string, ItemStats>>(STORAGE_KEYS.stats, {});
  const currentEntryId = useStorage<string | null>(STORAGE_KEYS.currentEntryId, null);
  const currentScript = useStorage<ScriptKind | null>(STORAGE_KEYS.currentScript, null);
  const session = useStorage<SessionSnapshot>(STORAGE_KEYS.session, { ...EMPTY_SESSION });

  settings.value = mergeSettings(
    settings.value as PracticeSettings & { hideAfterCorrect?: number },
  );
  stats.value = migrateStatsMap(stats.value);
  session.value = {
    ...EMPTY_SESSION,
    ...session.value,
    buryUntil: session.value.buryUntil ?? {},
  };

  // 从旧键 currentScripts（可能为数组）迁移到单值 currentScript
  if (currentScript.value == null) {
    try {
      const legacyRaw = localStorage.getItem(
        `${STORAGE_PREFIX}${LEGACY_STORAGE_KEYS.currentScripts}`,
      );
      if (legacyRaw != null) {
        currentScript.value = coerceScript(JSON.parse(legacyRaw) as unknown);
        localStorage.removeItem(`${STORAGE_PREFIX}${LEGACY_STORAGE_KEYS.currentScripts}`);
      }
    } catch {
      // 忽略损坏的旧数据
    }
  } else {
    currentScript.value = coerceScript(currentScript.value);
  }

  const current = ref<PracticeRound | null>(null);

  const enabledEntries = computed(() =>
    GOJUUON.filter((e) => settings.value.enabledGroups.includes(e.group)).sort(
      (a, b) => a.order - b.order,
    ),
  );

  const entryById = computed(() => new Map(enabledEntries.value.map((e) => [e.id, e])));

  /**
   * 读取某卡片统计，缺省返回空统计。
   * @param key - 卡片键
   * @returns 统计对象
   * @副作用 无
   */
  function getStats(key: string): ItemStats {
    return stats.value[key] ?? emptyStats();
  }

  /**
   * 按当前设置列出全部可练卡片键。
   * @returns 卡片键数组
   * @副作用 无
   */
  function allCardKeys(): string[] {
    const keys: string[] = [];
    const scripts = scriptsForMode(settings.value.scriptMode);
    for (const entry of enabledEntries.value) {
      for (const script of scripts) {
        keys.push(itemKey(entry.id, script));
      }
    }
    return keys;
  }

  /**
   * 若跨日则重置会话额度与队列。
   * @param now - 当前时间
   * @returns 无
   * @副作用 可能覆写 `session`
   */
  function ensureSessionDay(now = Date.now()) {
    const today = localDateKey(now);
    if (session.value.date !== today) {
      session.value = {
        ...EMPTY_SESSION,
        date: today,
      };
    }
  }

  /**
   * 卡片是否仍处在答错「暂避」窗口。
   * @param key - 卡片键
   * @returns 是否暂避
   * @副作用 无
   */
  function isBuried(key: string): boolean {
    const until = session.value.buryUntil?.[key];
    return until != null && until > session.value.reviewedCount;
  }

  /**
   * 清除某卡的暂避标记。
   * @param key - 卡片键
   * @returns 无
   * @副作用 更新 `session.buryUntil`
   */
  function clearBury(key: string) {
    const buryUntil = session.value.buryUntil;
    if (!buryUntil || buryUntil[key] == null) return;
    const next = { ...buryUntil };
    delete next[key];
    session.value = { ...session.value, buryUntil: next };
  }

  /**
   * 按设置对键列表排序或随机打乱。
   * @param keys - 原始键列表
   * @returns 新数组（已排序或已洗牌）
   * @副作用 无（洗牌作用于副本）
   */
  function sortOrShuffle(keys: string[]): string[] {
    const copy = [...keys];
    if (settings.value.orderMode === "random") {
      return shuffleInPlace(copy);
    }
    return copy.sort((a, b) => compareCardKeys(a, b, entryById.value));
  }

  /**
   * 构建仅含到期卡的会话队列（新卡按需单独引入）。
   * @param now - 当前时间
   * @returns 到期卡片键队列
   * @副作用 可能切日重置 session
   */
  function buildSessionQueue(now = Date.now()): string[] {
    ensureSessionDay(now);
    const due: string[] = [];
    for (const key of allCardKeys()) {
      if (isDue(getStats(key), now)) due.push(key);
    }
    return sortOrShuffle(due);
  }

  /**
   * 队列为空时用到期卡重建。
   * @param now - 当前时间
   * @returns 无
   * @副作用 可能写入 `session.queue`
   */
  function refillQueueIfNeeded(now = Date.now()) {
    ensureSessionDay(now);
    if (session.value.queue.length > 0) return;
    session.value = {
      ...session.value,
      queue: buildSessionQueue(now),
    };
  }

  /**
   * 将卡片键解析为合法练习轮次（字体需落在当前模式内）。
   * @param key - 卡片键
   * @returns 练习轮次；非法或缺条目时 null
   * @副作用 无
   */
  function roundFromCardKey(key: string): PracticeRound | null {
    const parsed = parseItemKey(key);
    if (!parsed) return null;
    const entry = entryById.value.get(parsed.entryId);
    if (!entry) return null;
    const modeScripts = scriptsForMode(settings.value.scriptMode);
    const script = modeScripts.includes(parsed.script)
      ? parsed.script
      : (modeScripts[0] ?? parsed.script);
    return { entry, script };
  }

  /**
   * 引入下一张从未练过的新卡，并消耗今日新卡额度。
   * @param now - 当前时间
   * @param excludeEntryId - 可选：避免与刚练过的假名重复
   * @returns 新的练习轮次；额度用尽或无新卡时返回 null
   * @副作用 更新 stats.dueAt、session.newIntroduced
   */
  function introduceNextNewCard(now = Date.now(), excludeEntryId?: string): PracticeRound | null {
    ensureSessionDay(now);
    const remainingNew = Math.max(0, settings.value.newCardsPerDay - session.value.newIntroduced);
    if (remainingNew <= 0) return null;

    const fresh: string[] = [];
    for (const key of allCardKeys()) {
      if (isNewCard(getStats(key))) fresh.push(key);
    }
    if (fresh.length === 0) return null;

    const preferred = excludeEntryId
      ? fresh.filter((key) => parseItemKey(key)?.entryId !== excludeEntryId)
      : fresh;
    const nextKey = sortOrShuffle(preferred.length > 0 ? preferred : fresh)[0];
    if (!nextKey) return null;

    const round = roundFromCardKey(nextKey);
    if (!round) return null;

    const prev = getStats(nextKey);
    stats.value = {
      ...stats.value,
      [nextKey]: { ...prev, dueAt: now },
    };
    session.value = {
      ...session.value,
      newIntroduced: session.value.newIntroduced + 1,
    };

    return round;
  }

  /**
   * 从队列取出下一轮；必要时引入新卡或轮转暂避卡。
   * @param excludeEntryId - 可选：推进时避开的假名 id
   * @returns 下一轮练习；今日无可练时 null
   * @副作用 弹出队列、清暂避、可能引入新卡
   */
  function takeNextRound(excludeEntryId?: string): PracticeRound | null {
    const now = Date.now();
    refillQueueIfNeeded(now);

    const rotated = new Set<string>();
    let guard = 0;
    while (guard++ < TAKE_ROUND_GUARD_LIMIT) {
      if (session.value.queue.length === 0) {
        refillQueueIfNeeded(now);
        if (session.value.queue.length === 0) {
          return introduceNextNewCard(now, excludeEntryId);
        }
      }

      const firstKey = session.value.queue[0];
      if (!firstKey) {
        session.value = { ...session.value, queue: session.value.queue.slice(1) };
        continue;
      }

      const parsed = parseItemKey(firstKey);
      if (!parsed) {
        session.value = { ...session.value, queue: session.value.queue.slice(1) };
        continue;
      }

      const blockedByExclude = Boolean(excludeEntryId && parsed.entryId === excludeEntryId);
      const blockedByBury = isBuried(firstKey);

      if (blockedByExclude || blockedByBury) {
        if (rotated.has(firstKey)) {
          const introduced = introduceNextNewCard(now, excludeEntryId);
          if (introduced) return introduced;
        } else {
          rotated.add(firstKey);
          session.value = {
            ...session.value,
            queue: [...session.value.queue.slice(1), firstKey],
          };
          continue;
        }
      }

      const round = roundFromCardKey(firstKey);
      if (!round) {
        session.value = { ...session.value, queue: session.value.queue.slice(1) };
        continue;
      }

      session.value = {
        ...session.value,
        queue: session.value.queue.slice(1),
      };
      clearBury(firstKey);
      return round;
    }

    return null;
  }

  /**
   * 设置当前轮次并同步持久化的当前假名 / 字体。
   * @param round - 练习轮次或 null
   * @returns 无
   * @副作用 写 `current` 与 storage 中的当前项
   */
  function setCurrent(round: PracticeRound | null) {
    current.value = round;
    currentEntryId.value = round?.entry.id ?? null;
    currentScript.value = round?.script ?? null;
  }

  /**
   * 推进到下一轮。
   * @param excludeEntryId - 可选避开的假名
   * @returns 无
   * @副作用 更新当前轮次与队列
   */
  function advance(excludeEntryId?: string) {
    setCurrent(takeNextRound(excludeEntryId));
  }

  /**
   * 尝试从持久化的 currentEntryId / currentScript 恢复当前轮。
   * @returns 是否恢复成功
   * @副作用 可能写 `current`
   */
  function restoreCurrent(): boolean {
    const id = currentEntryId.value;
    if (!id) return false;
    const entry = entryById.value.get(id);
    if (!entry) return false;

    const allowed = scriptsForMode(settings.value.scriptMode);
    const preferred = coerceScript(currentScript.value);
    const script = preferred && allowed.includes(preferred) ? preferred : (allowed[0] ?? null);
    if (!script) return false;

    current.value = { entry, script };
    return true;
  }

  /**
   * 确保有合法当前轮（恢复或新取）；设置变更后也会调用。
   * @returns 无
   * @副作用 可能改队列与当前轮
   */
  function ensureCurrent() {
    ensureSessionDay();
    if (!current.value) {
      if (!restoreCurrent()) advance();
      return;
    }
    const entry = entryById.value.get(current.value.entry.id);
    if (!entry) {
      advance(current.value.entry.id);
      return;
    }
    const allowed = scriptsForMode(settings.value.scriptMode);
    const script = allowed.includes(current.value.script)
      ? current.value.script
      : (allowed[0] ?? null);
    if (!script) {
      advance(entry.id);
      return;
    }
    setCurrent({ entry, script });
  }

  /**
   * 对当前轮自评对错，并更新 SRS / 队列。
   * @param correct - 是否正确
   * @returns 无
   * @副作用 写 stats、session（含答错再入队与暂避）
   */
  function gradeCurrent(correct: boolean) {
    const round = current.value;
    if (!round) return;

    const key = itemKey(round.entry.id, round.script);
    const now = Date.now();
    const next = applySrsGrade(getStats(key), correct, now);
    stats.value = { ...stats.value, [key]: next };

    ensureSessionDay(now);
    const reviewedCount = session.value.reviewedCount + 1;
    session.value = {
      ...session.value,
      reviewedCount,
    };

    if (!correct) {
      const q = session.value.queue.filter((k) => k !== key);
      q.push(key);
      session.value = {
        ...session.value,
        queue: q,
        buryUntil: {
          ...(session.value.buryUntil ?? {}),
          [key]: reviewedCount + WRONG_REQUEUE_GAP,
        },
      };
    } else {
      clearBury(key);
    }
  }

  /**
   * 进入下一轮（避开刚练过的假名 id）。
   * @returns 无
   * @副作用 更新当前轮与队列
   */
  function nextRound() {
    const id = current.value?.entry.id;
    advance(id);
  }

  /**
   * 清空全部进度与会话，并重新出题。
   * @returns 无
   * @副作用 清空 stats / session；删除若干旧 localStorage 键
   */
  function resetProgress() {
    stats.value = {};
    currentEntryId.value = null;
    currentScript.value = null;
    session.value = { ...EMPTY_SESSION, date: localDateKey() };
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${LEGACY_STORAGE_KEYS.streaks}`);
      localStorage.removeItem(`${STORAGE_PREFIX}${LEGACY_STORAGE_KEYS.randomQueue}`);
      localStorage.removeItem(`${STORAGE_PREFIX}${LEGACY_STORAGE_KEYS.sequentialIndex}`);
      localStorage.removeItem(`${STORAGE_PREFIX}${LEGACY_STORAGE_KEYS.currentScripts}`);
    } catch {
      // ignore
    }
    advance();
  }

  /**
   * 清空会话队列并按当前设置重建（保留 SRS 与今日新卡额度）。
   * @returns 无
   * @副作用 重建 queue 并设置当前轮
   */
  function restartFromBeginning() {
    ensureSessionDay();
    session.value = {
      ...session.value,
      queue: buildSessionQueue(),
    };
    setCurrent(takeNextRound());
  }

  /**
   * 部分更新练习设置；题库相关变更时清空会话队列。
   * @param patch - 设置补丁
   * @returns 无
   * @副作用 写 settings；可能清空 queue
   */
  function updateSettings(patch: Partial<PracticeSettings>) {
    const prev = settings.value;
    const next = mergeSettings({ ...settings.value, ...patch });
    settings.value = next;

    const deckChanged =
      prev.orderMode !== next.orderMode ||
      prev.scriptMode !== next.scriptMode ||
      prev.enabledGroups.join() !== next.enabledGroups.join() ||
      prev.newCardsPerDay !== next.newCardsPerDay;

    if (deckChanged) {
      ensureSessionDay();
      session.value = { ...session.value, queue: [] };
    }
  }

  const dueCount = computed(() => {
    const now = Date.now();
    return allCardKeys().filter((key) => isReviewDue(getStats(key), now)).length;
  });

  const newRemainingToday = computed(() =>
    Math.max(0, settings.value.newCardsPerDay - session.value.newIntroduced),
  );

  const reviewedToday = computed(() => session.value.reviewedCount);

  const progressRows = computed((): ProgressRow[] => {
    const now = Date.now();
    const rows: ProgressRow[] = [];
    for (const entry of GOJUUON) {
      for (const script of ["hiragana", "katakana"] as ScriptKind[]) {
        const key = itemKey(entry.id, script);
        const s = getStats(key);
        rows.push({
          key,
          entryId: entry.id,
          script,
          kana: kanaGlyph(entry, script),
          romaji: entry.romaji,
          group: entry.group,
          order: entry.order,
          stats: s,
          mastered: s.stage >= SrsStageLevel.MATURE,
          tone: progressTone(s),
          stageLabel: stageLabel(s.stage),
          dueLabel: formatDue(s.dueAt, now),
        });
      }
    }
    return rows.sort((a, b) => a.order - b.order || a.script.localeCompare(b.script));
  });

  watch(
    settings,
    () => {
      ensureCurrent();
    },
    { deep: true },
  );

  ensureCurrent();

  return {
    settings,
    current,
    dueCount,
    newRemainingToday,
    reviewedToday,
    progressRows,
    gradeCurrent,
    nextRound,
    resetProgress,
    restartFromBeginning,
    updateSettings,
    scriptLabel,
    /**
     * 当前轮假名字形。
     * @returns 假名字符串；无当前轮时为空串
     */
    currentKana: () => (current.value ? kanaGlyph(current.value.entry, current.value.script) : ""),
  };
}
