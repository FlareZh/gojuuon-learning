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
}

const DEFAULT_SETTINGS: PracticeSettings = {
  scriptMode: "both",
  orderMode: "sequential",
  newCardsPerDay: 10,
  enabledGroups: ["seion", "dakuon", "handakuon", "youon"],
};

const EMPTY_SESSION: SessionSnapshot = {
  queue: [],
  date: "",
  newIntroduced: 0,
  reviewedCount: 0,
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
        queue: [],
        date: today,
        newIntroduced: 0,
        reviewedCount: 0,
      };
    }
  }

  function sortOrShuffle(keys: string[]): string[] {
    const copy = [...keys];
    if (settings.value.orderMode === "random") {
      return shuffleInPlace(copy);
    }
    return copy.sort((a, b) => compareCardKeys(a, b, entryById.value));
  }

  function buildSessionQueue(now = Date.now()): string[] {
    ensureSessionDay(now);
    const keys = allCardKeys();
    const due: string[] = [];
    const fresh: string[] = [];

    for (const key of keys) {
      const s = getStats(key);
      if (isDue(s, now)) due.push(key);
      else if (isNewCard(s)) fresh.push(key);
    }

    const dueSorted = sortOrShuffle(due);
    const freshSorted = sortOrShuffle(fresh);
    const remainingNew = Math.max(0, settings.value.newCardsPerDay - session.value.newIntroduced);
    const newBatch = freshSorted.slice(0, remainingNew);

    // Mark introduced new cards so quota persists across rebuilds today.
    if (newBatch.length > 0) {
      const nextStats = { ...stats.value };
      for (const key of newBatch) {
        const prev = getStats(key);
        if (prev.dueAt == null) {
          nextStats[key] = { ...prev, dueAt: now };
        }
      }
      stats.value = nextStats;
      session.value = {
        ...session.value,
        newIntroduced: session.value.newIntroduced + newBatch.length,
      };
    }

    return [...dueSorted, ...newBatch];
  }

  function refillQueueIfNeeded(now = Date.now()) {
    ensureSessionDay(now);
    if (session.value.queue.length > 0) return;
    session.value = {
      ...session.value,
      queue: buildSessionQueue(now),
    };
  }

  /**
   * Peek upcoming card keys and merge consecutive same-entry scripts into one round.
   */
  function takeNextRound(excludeEntryId?: string): PracticeRound | null {
    const now = Date.now();
    refillQueueIfNeeded(now);

    const rotated = new Set<string>();
    let guard = 0;
    while (guard++ < 5000) {
      if (session.value.queue.length === 0) {
        refillQueueIfNeeded(now);
        if (session.value.queue.length === 0) return null;
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

      if (excludeEntryId && parsed.entryId === excludeEntryId) {
        // Defer same entry (e.g. wrong-card requeue) until later in the session.
        if (rotated.has(firstKey)) return null;
        rotated.add(firstKey);
        session.value = {
          ...session.value,
          queue: [...session.value.queue.slice(1), firstKey],
        };
        continue;
      }

      const entry = entryById.value.get(parsed.entryId);
      if (!entry) {
        session.value = { ...session.value, queue: session.value.queue.slice(1) };
        continue;
      }

      const scripts: ScriptKind[] = [parsed.script];
      let consumed = 1;
      for (let i = 1; i < session.value.queue.length; i++) {
        const next = parseItemKey(session.value.queue[i]!);
        if (!next || next.entryId !== parsed.entryId) break;
        if (!scripts.includes(next.script)) scripts.push(next.script);
        consumed += 1;
      }

      session.value = {
        ...session.value,
        queue: session.value.queue.slice(consumed),
      };

      // Stable script order: hiragana then katakana
      scripts.sort((a, b) => (a === b ? 0 : a === "hiragana" ? -1 : 1));
      return { entry, scripts };
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

    const preferred = currentScripts.value.filter((s) =>
      scriptsForMode(settings.value.scriptMode).includes(s),
    );
    const scripts =
      preferred.length > 0 ? preferred : scriptsForMode(settings.value.scriptMode).slice(0, 1);

    // Prefer scripts that are still due or were in the saved round.
    const now = Date.now();
    const dueScripts = scripts.filter((script) => {
      const s = getStats(itemKey(id, script));
      return isDue(s, now) || s.lastReviewedAt != null || isNewCard(s) || s.dueAt != null;
    });
    const finalScripts = (dueScripts.length > 0 ? dueScripts : scripts).sort((a, b) =>
      a === b ? 0 : a === "hiragana" ? -1 : 1,
    );
    if (finalScripts.length === 0) return false;

    current.value = { entry, scripts: finalScripts };
    return true;
  }

  function ensureCurrent() {
    ensureSessionDay();
    if (!current.value) {
      if (!restoreCurrent()) advance();
      return;
    }
    // Keep current if entry still enabled; refresh script list against mode.
    const entry = entryById.value.get(current.value.entry.id);
    if (!entry) {
      advance(current.value.entry.id);
      return;
    }
    const allowed = scriptsForMode(settings.value.scriptMode);
    const scripts = current.value.scripts.filter((s) => allowed.includes(s));
    if (scripts.length === 0) {
      advance(entry.id);
      return;
    }
    setCurrent({ entry, scripts });
  }

  function gradeScript(script: ScriptKind, correct: boolean) {
    const round = current.value;
    if (!round || !round.scripts.includes(script)) return;

    const key = itemKey(round.entry.id, script);
    const now = Date.now();
    const next = applySrsGrade(getStats(key), correct, now);
    stats.value = { ...stats.value, [key]: next };

    ensureSessionDay(now);
    session.value = {
      ...session.value,
      reviewedCount: session.value.reviewedCount + 1,
    };

    // Wrong: requeue at end for same-session retry.
    if (!correct) {
      const q = session.value.queue.filter((k) => k !== key);
      q.push(key);
      session.value = { ...session.value, queue: q };
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
    return allCardKeys().filter((key) => isDue(getStats(key), now)).length;
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
