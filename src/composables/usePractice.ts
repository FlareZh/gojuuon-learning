import { computed, ref, watch } from "vue";
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

export type { ItemStats } from "./srs";
export { emptyStats, formatDue, progressTone, stageLabel } from "./srs";

export type ScriptMode = "hiragana" | "katakana" | "both";
export type OrderMode = "sequential" | "random";

export interface PracticeSettings {
  scriptMode: ScriptMode;
  orderMode: OrderMode;
  newCardsPerDay: number;
  enabledGroups: KanaGroup[];
}

/** One practice round = one romaji entry; scripts graded independently. */
export interface PracticeRound {
  entry: KanaEntry;
  scripts: ScriptKind[];
}

export interface ProgressRow {
  key: string;
  entryId: string;
  script: ScriptKind;
  kana: string;
  romaji: string;
  group: KanaGroup;
  order: number;
  stats: ItemStats;
  /** stage === 5 (mature); still reviewed when due */
  mastered: boolean;
  tone: string;
  stageLabel: string;
  dueLabel: string;
}

export interface SessionSnapshot {
  /** Card keys `entryId:script` remaining in this session */
  queue: string[];
  date: string;
  newIntroduced: number;
  reviewedCount: number;
  /** Don't show key again until reviewedCount reaches this (wrong-card spacing). */
  buryUntil: Record<string, number>;
}

const DEFAULT_SETTINGS: PracticeSettings = {
  scriptMode: "both",
  orderMode: "sequential",
  newCardsPerDay: 10,
  enabledGroups: ["seion", "dakuon", "handakuon", "youon"],
};

/** Other cards to grade before a wrong card can reappear in this session. */
const WRONG_REQUEUE_GAP = 3;

const EMPTY_SESSION: SessionSnapshot = {
  queue: [],
  date: "",
  newIntroduced: 0,
  reviewedCount: 0,
  buryUntil: {},
};

export function itemKey(entryId: string, script: ScriptKind): string {
  return `${entryId}:${script}`;
}

function parseItemKey(key: string): { entryId: string; script: ScriptKind } | null {
  const idx = key.lastIndexOf(":");
  if (idx < 0) return null;
  const entryId = key.slice(0, idx);
  const script = key.slice(idx + 1);
  if (script !== "hiragana" && script !== "katakana") return null;
  return { entryId, script };
}

function scriptsForMode(mode: ScriptMode): ScriptKind[] {
  if (mode === "hiragana") return ["hiragana"];
  if (mode === "katakana") return ["katakana"];
  return ["hiragana", "katakana"];
}

function scriptLabel(script: ScriptKind): string {
  return script === "hiragana" ? "平假名" : "片假名";
}

function mergeSettings(value: PracticeSettings & { hideAfterCorrect?: number }): PracticeSettings {
  const groups = value.enabledGroups?.length ? value.enabledGroups : DEFAULT_SETTINGS.enabledGroups;
  const rawNew =
    typeof value.newCardsPerDay === "number"
      ? value.newCardsPerDay
      : DEFAULT_SETTINGS.newCardsPerDay;
  return {
    scriptMode: value.scriptMode ?? DEFAULT_SETTINGS.scriptMode,
    orderMode: value.orderMode ?? DEFAULT_SETTINGS.orderMode,
    newCardsPerDay: Math.min(40, Math.max(1, Math.round(rawNew))),
    enabledGroups: groups,
  };
}

/** Fisher–Yates shuffle (in place). */
function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

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

export function usePractice() {
  const settings = useStorage<PracticeSettings>("settings", { ...DEFAULT_SETTINGS });
  const stats = useStorage<Record<string, ItemStats>>("stats", {});
  const currentEntryId = useStorage<string | null>("currentEntryId", null);
  const currentScripts = useStorage<ScriptKind[]>("currentScripts", []);
  const session = useStorage<SessionSnapshot>("session", { ...EMPTY_SESSION });

  settings.value = mergeSettings(
    settings.value as PracticeSettings & { hideAfterCorrect?: number },
  );
  stats.value = migrateStatsMap(stats.value);
  session.value = {
    ...EMPTY_SESSION,
    ...session.value,
    buryUntil: session.value.buryUntil ?? {},
  };

  const current = ref<PracticeRound | null>(null);

  const enabledEntries = computed(() =>
    GOJUUON.filter((e) => settings.value.enabledGroups.includes(e.group)).sort(
      (a, b) => a.order - b.order,
    ),
  );

  const entryById = computed(() => new Map(enabledEntries.value.map((e) => [e.id, e])));

  function getStats(key: string): ItemStats {
    return stats.value[key] ?? emptyStats();
  }

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

  function ensureSessionDay(now = Date.now()) {
    const today = localDateKey(now);
    if (session.value.date !== today) {
      session.value = {
        ...EMPTY_SESSION,
        date: today,
      };
    }
  }

  function isBuried(key: string): boolean {
    const until = session.value.buryUntil?.[key];
    return until != null && until > session.value.reviewedCount;
  }

  function clearBury(key: string) {
    const buryUntil = session.value.buryUntil;
    if (!buryUntil || buryUntil[key] == null) return;
    const next = { ...buryUntil };
    delete next[key];
    session.value = { ...session.value, buryUntil: next };
  }

  function sortOrShuffle(keys: string[]): string[] {
    const copy = [...keys];
    if (settings.value.orderMode === "random") {
      return shuffleInPlace(copy);
    }
    return copy.sort((a, b) => compareCardKeys(a, b, entryById.value));
  }

  /** Due / in-progress cards only. New cards are introduced one at a time when shown. */
  function buildSessionQueue(now = Date.now()): string[] {
    ensureSessionDay(now);
    const due: string[] = [];
    for (const key of allCardKeys()) {
      if (isDue(getStats(key), now)) due.push(key);
    }
    return sortOrShuffle(due);
  }

  function refillQueueIfNeeded(now = Date.now()) {
    ensureSessionDay(now);
    if (session.value.queue.length > 0) return;
    session.value = {
      ...session.value,
      queue: buildSessionQueue(now),
    };
  }

  /** Pull the next never-seen card into play and spend one of today's new-card slots. */
  function introduceNextNewCard(
    now = Date.now(),
    excludeEntryId?: string,
  ): PracticeRound | null {
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

    const parsed = parseItemKey(nextKey);
    if (!parsed) return null;
    const entry = entryById.value.get(parsed.entryId);
    if (!entry) return null;

    const modeScripts = scriptsForMode(settings.value.scriptMode);
    const script = modeScripts.includes(parsed.script)
      ? parsed.script
      : (modeScripts[0] ?? parsed.script);

    const prev = getStats(nextKey);
    stats.value = {
      ...stats.value,
      [nextKey]: { ...prev, dueAt: now },
    };
    session.value = {
      ...session.value,
      newIntroduced: session.value.newIntroduced + 1,
    };

    return { entry, scripts: [script] };
  }

  /** One queue card = one script; never merge 平/片 into a dual round. */
  function takeNextRound(excludeEntryId?: string): PracticeRound | null {
    const now = Date.now();
    refillQueueIfNeeded(now);

    const modeScripts = scriptsForMode(settings.value.scriptMode);
    const rotated = new Set<string>();
    let guard = 0;
    while (guard++ < 5000) {
      if (session.value.queue.length === 0) {
        refillQueueIfNeeded(now);
        if (session.value.queue.length === 0) {
          // No due reviews left — reveal the next new card (decrements 新卡剩余).
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
        // Defer same entry / recently-wrong card; prefer other due cards or a new card.
        if (rotated.has(firstKey)) {
          const introduced = introduceNextNewCard(now, excludeEntryId);
          if (introduced) return introduced;
          // Nothing else left today — still retry unresolved wrongs instead of ending.
        } else {
          rotated.add(firstKey);
          session.value = {
            ...session.value,
            queue: [...session.value.queue.slice(1), firstKey],
          };
          continue;
        }
      }

      const entry = entryById.value.get(parsed.entryId);
      if (!entry) {
        session.value = { ...session.value, queue: session.value.queue.slice(1) };
        continue;
      }

      session.value = {
        ...session.value,
        queue: session.value.queue.slice(1),
      };
      clearBury(firstKey);

      const script = modeScripts.includes(parsed.script)
        ? parsed.script
        : (modeScripts[0] ?? parsed.script);
      return { entry, scripts: [script] };
    }

    return null;
  }

  function setCurrent(round: PracticeRound | null) {
    current.value = round;
    currentEntryId.value = round?.entry.id ?? null;
    currentScripts.value = round?.scripts ?? [];
  }

  function advance(excludeEntryId?: string) {
    setCurrent(takeNextRound(excludeEntryId));
  }

  function restoreCurrent(): boolean {
    const id = currentEntryId.value;
    if (!id) return false;
    const entry = entryById.value.get(id);
    if (!entry) return false;

    const allowed = scriptsForMode(settings.value.scriptMode);
    const preferred = currentScripts.value.find((s) => allowed.includes(s));
    const script = preferred ?? allowed[0];
    if (!script) return false;

    current.value = { entry, scripts: [script] };
    return true;
  }

  function ensureCurrent() {
    ensureSessionDay();
    if (!current.value) {
      if (!restoreCurrent()) advance();
      return;
    }
    // Keep current if entry still enabled; collapse any legacy dual round to one script.
    const entry = entryById.value.get(current.value.entry.id);
    if (!entry) {
      advance(current.value.entry.id);
      return;
    }
    const allowed = scriptsForMode(settings.value.scriptMode);
    const script = current.value.scripts.find((s) => allowed.includes(s)) ?? allowed[0];
    if (!script) {
      advance(entry.id);
      return;
    }
    setCurrent({ entry, scripts: [script] });
  }

  function gradeScript(script: ScriptKind, correct: boolean) {
    const round = current.value;
    if (!round || !round.scripts.includes(script)) return;

    const key = itemKey(round.entry.id, script);
    const now = Date.now();
    const next = applySrsGrade(getStats(key), correct, now);
    stats.value = { ...stats.value, [key]: next };

    ensureSessionDay(now);
    const reviewedCount = session.value.reviewedCount + 1;
    session.value = {
      ...session.value,
      reviewedCount,
    };

    // Wrong: come back later this session, but not as the very next cards.
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

  function nextRound() {
    const id = current.value?.entry.id;
    advance(id);
  }

  function resetProgress() {
    stats.value = {};
    currentEntryId.value = null;
    currentScripts.value = [];
    session.value = { ...EMPTY_SESSION, date: localDateKey() };
    try {
      localStorage.removeItem("gojuuon-learning:streaks");
      localStorage.removeItem("gojuuon-learning:randomQueue");
      localStorage.removeItem("gojuuon-learning:sequentialIndex");
    } catch {
      // ignore
    }
    advance();
  }

  /** Clear session queue and rebuild (keeps SRS history and today's new-card quota). */
  function restartFromBeginning() {
    ensureSessionDay();
    session.value = {
      ...session.value,
      queue: [],
    };
    session.value = {
      ...session.value,
      queue: buildSessionQueue(),
    };
    setCurrent(takeNextRound());
  }

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
          mastered: s.stage >= 5,
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
    stats,
    current,
    dueCount,
    newRemainingToday,
    reviewedToday,
    newCardsPerDay: computed(() => settings.value.newCardsPerDay),
    progressRows,
    gradeScript,
    nextRound,
    resetProgress,
    restartFromBeginning,
    updateSettings,
    scriptLabel,
    kanaFor: (script: ScriptKind) => (current.value ? kanaGlyph(current.value.entry, script) : ""),
  };
}
