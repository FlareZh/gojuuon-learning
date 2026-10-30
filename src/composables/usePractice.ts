import { computed, ref, watch } from "vue";
import {
  GOJUUON,
  kanaGlyph,
  type KanaEntry,
  type KanaGroup,
  type ScriptKind,
} from "@/data/gojuuon";
import { useStorage } from "./useStorage";

export type ScriptMode = "hiragana" | "katakana" | "both";
export type OrderMode = "sequential" | "random";

export interface PracticeSettings {
  scriptMode: ScriptMode;
  orderMode: OrderMode;
  hideAfterCorrect: number;
  enabledGroups: KanaGroup[];
}

export interface PracticeItem {
  entry: KanaEntry;
  script: ScriptKind;
  key: string;
}

const DEFAULT_SETTINGS: PracticeSettings = {
  scriptMode: "hiragana",
  orderMode: "sequential",
  hideAfterCorrect: 3,
  enabledGroups: ["seion", "dakuon", "handakuon", "youon"],
};

function itemKey(entryId: string, script: ScriptKind): string {
  return `${entryId}:${script}`;
}

function buildPool(settings: PracticeSettings): PracticeItem[] {
  const entries = GOJUUON.filter((e) => settings.enabledGroups.includes(e.group)).sort(
    (a, b) => a.order - b.order,
  );

  const items: PracticeItem[] = [];
  for (const entry of entries) {
    if (settings.scriptMode === "hiragana" || settings.scriptMode === "both") {
      items.push({ entry, script: "hiragana", key: itemKey(entry.id, "hiragana") });
    }
    if (settings.scriptMode === "katakana" || settings.scriptMode === "both") {
      items.push({ entry, script: "katakana", key: itemKey(entry.id, "katakana") });
    }
  }
  return items;
}

export function usePractice() {
  const settings = useStorage<PracticeSettings>("settings", { ...DEFAULT_SETTINGS });
  const streaks = useStorage<Record<string, number>>("streaks", {});
  const sequentialIndex = useStorage<number>("sequentialIndex", 0);

  const current = ref<PracticeItem | null>(null);

  const pool = computed(() => buildPool(settings.value));

  const activePool = computed(() => {
    const n = Math.max(1, settings.value.hideAfterCorrect);
    return pool.value.filter((item) => (streaks.value[item.key] ?? 0) < n);
  });

  const remainingCount = computed(() => activePool.value.length);
  const totalCount = computed(() => pool.value.length);
  const hiddenCount = computed(() => totalCount.value - remainingCount.value);

  function pickNext(excludeKey?: string): PracticeItem | null {
    const candidates = activePool.value.filter((item) => item.key !== excludeKey);
    if (candidates.length === 0) return null;

    if (settings.value.orderMode === "random") {
      const idx = Math.floor(Math.random() * candidates.length);
      return candidates[idx] ?? null;
    }

    // Sequential: advance through full pool order, skipping hidden / excluded
    const full = pool.value;
    if (full.length === 0) return null;

    let start = sequentialIndex.value % full.length;
    for (let i = 0; i < full.length; i++) {
      const idx = (start + i) % full.length;
      const item = full[idx];
      if (!item) continue;
      if (item.key === excludeKey) continue;
      const n = Math.max(1, settings.value.hideAfterCorrect);
      if ((streaks.value[item.key] ?? 0) >= n) continue;
      sequentialIndex.value = (idx + 1) % full.length;
      return item;
    }
    return null;
  }

  function advance(excludeKey?: string) {
    current.value = pickNext(excludeKey);
  }

  function ensureCurrent() {
    if (!current.value) {
      advance();
      return;
    }
    const stillActive = activePool.value.some((item) => item.key === current.value?.key);
    if (!stillActive) advance();
  }

  function grade(correct: boolean) {
    const item = current.value;
    if (!item) return;

    const nextStreaks = { ...streaks.value };
    if (correct) {
      nextStreaks[item.key] = (nextStreaks[item.key] ?? 0) + 1;
    } else {
      nextStreaks[item.key] = 0;
    }
    streaks.value = nextStreaks;
    advance(item.key);
  }

  function resetProgress() {
    streaks.value = {};
    sequentialIndex.value = 0;
    advance();
  }

  function updateSettings(patch: Partial<PracticeSettings>) {
    settings.value = { ...settings.value, ...patch };
  }

  watch(
    settings,
    () => {
      // Settings change restores hidden items into consideration via activePool
      ensureCurrent();
    },
    { deep: true },
  );

  // Initial pick
  ensureCurrent();

  return {
    settings,
    streaks,
    current,
    remainingCount,
    totalCount,
    hiddenCount,
    grade,
    advance,
    resetProgress,
    updateSettings,
    kanaForCurrent: computed(() =>
      current.value ? kanaGlyph(current.value.entry, current.value.script) : "",
    ),
    scriptLabel: computed(() => {
      if (!current.value) return "";
      return current.value.script === "hiragana" ? "平假名" : "片假名";
    }),
  };
}
