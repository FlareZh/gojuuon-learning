<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ProgressRow } from "@/composables/usePractice";
import { GOJUUON_CHART } from "@/data/gojuuonChart";
import type { ScriptKind } from "@/data/gojuuon";

const props = defineProps<{
  open: boolean;
  rows: ProgressRow[];
}>();

defineEmits<{
  close: [];
}>();

const tab = ref<ScriptKind>("hiragana");
const selectedKey = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (open) {
      tab.value = "hiragana";
      selectedKey.value = null;
    }
  },
);

watch(tab, () => {
  selectedKey.value = null;
});

const rowByKey = computed(() => {
  const map = new Map<string, ProgressRow>();
  for (const row of props.rows) {
    if (row.script === tab.value) map.set(row.entryId, row);
  }
  return map;
});

const summary = computed(() => {
  const rows = props.rows.filter((row) => row.script === tab.value);
  const practiced = rows.filter((row) => row.stats.correct > 0 || row.stats.wrong > 0);
  const mature = rows.filter((row) => row.mastered);
  const learning = rows.filter((row) => row.tone === "learning");
  const review = rows.filter((row) => row.tone === "review");
  return {
    total: rows.length,
    practiced: practiced.length,
    mature: mature.length,
    learning: learning.length,
    review: review.length,
  };
});

const selected = computed(() => {
  if (!selectedKey.value) return null;
  return rowByKey.value.get(selectedKey.value) ?? null;
});

function cellTone(row: ProgressRow | undefined): string {
  return row?.tone ?? "idle";
}

function selectCell(entryId: string | null) {
  if (!entryId) return;
  selectedKey.value = selectedKey.value === entryId ? null : entryId;
}
</script>

<template>
  <div v-if="open" class="panel" role="dialog" aria-modal="true" aria-labelledby="progress-title">
    <button type="button" class="panel__backdrop" aria-label="关闭进度" @click="$emit('close')" />
    <aside class="panel__sheet">
      <header class="panel__header">
        <h2 id="progress-title">学习进度</h2>
        <button type="button" class="panel__close" aria-label="关闭" @click="$emit('close')">
          ×
        </button>
      </header>

      <div class="segment">
        <button type="button" :class="{ active: tab === 'hiragana' }" @click="tab = 'hiragana'">
          平假名
        </button>
        <button type="button" :class="{ active: tab === 'katakana' }" @click="tab = 'katakana'">
          片假名
        </button>
      </div>

      <p class="panel__summary">
        已练 {{ summary.practiced }}/{{ summary.total }} · 学习 {{ summary.learning }} · 复习
        {{ summary.review }} · 成熟 {{ summary.mature }}
      </p>

      <div class="legend" aria-hidden="true">
        <span data-tone="idle">未练</span>
        <span data-tone="learning">学习中</span>
        <span data-tone="review">复习中</span>
        <span data-tone="mature">成熟</span>
        <span data-tone="weak">易错</span>
      </div>

      <section v-for="section in GOJUUON_CHART" :key="section.id" class="chart">
        <h3 class="chart__title">{{ section.title }}</h3>
        <div
          class="chart__grid"
          :style="{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }"
        >
          <div
            v-for="header in section.headers"
            :key="`${section.id}-h-${header}`"
            class="chart__head"
          >
            {{ header }}
          </div>
          <template v-for="(row, rowIndex) in section.rows" :key="`${section.id}-${rowIndex}`">
            <template v-for="(cellId, colIndex) in row" :key="`${section.id}-${rowIndex}-${colIndex}`">
              <button
                v-if="cellId"
                type="button"
                class="chart__cell"
                :data-tone="cellTone(rowByKey.get(cellId))"
                :data-selected="selectedKey === cellId"
                :aria-pressed="selectedKey === cellId"
                :aria-label="rowByKey.get(cellId)?.kana ?? cellId"
                @click="selectCell(cellId)"
              >
                <span class="chart__kana" lang="ja">{{ rowByKey.get(cellId)?.kana }}</span>
                <span
                  v-if="rowByKey.get(cellId)?.tone === 'weak'"
                  class="chart__mark"
                  aria-hidden="true"
                />
              </button>
              <div v-else class="chart__blank" aria-hidden="true" />
            </template>
          </template>
        </div>
      </section>

      <section v-if="selected" class="detail" aria-live="polite">
        <div class="detail__head">
          <span class="detail__kana" lang="ja">{{ selected.kana }}</span>
          <span class="detail__romaji">{{ selected.romaji }}</span>
          <span class="detail__badge">{{ selected.stageLabel }}</span>
        </div>
        <p class="detail__due">下次复习：{{ selected.dueLabel }}</p>
        <dl class="detail__stats">
          <div>
            <dt>正确</dt>
            <dd>{{ selected.stats.correct }}</dd>
          </div>
          <div>
            <dt>错误</dt>
            <dd>{{ selected.stats.wrong }}</dd>
          </div>
          <div>
            <dt>当前连对</dt>
            <dd>{{ selected.stats.currentCorrect }}</dd>
          </div>
          <div>
            <dt>当前连错</dt>
            <dd>{{ selected.stats.currentWrong }}</dd>
          </div>
          <div>
            <dt>最大连对</dt>
            <dd>{{ selected.stats.maxCorrect }}</dd>
          </div>
          <div>
            <dt>最大连错</dt>
            <dd>{{ selected.stats.maxWrong }}</dd>
          </div>
        </dl>
      </section>
      <p v-else class="panel__hint">点选假名查看详细统计</p>
    </aside>
  </div>
</template>

<style scoped>
.panel {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  justify-content: flex-end;
}

.panel__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(18, 28, 24, 0.38);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.panel__sheet {
  position: relative;
  width: min(480px, 100%);
  height: 100%;
  height: 100dvh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: #fffaf1;
  border-left: 1px solid rgba(45, 74, 62, 0.18);
  padding: 1.1rem 0.85rem calc(1.75rem + env(safe-area-inset-bottom, 0px));
  padding-right: max(0.85rem, env(safe-area-inset-right, 0px));
  box-shadow: -12px 0 32px rgba(18, 28, 24, 0.12);
  animation: slide 220ms ease;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  padding-top: env(safe-area-inset-top, 0px);
}

.panel__header h2 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 1.2rem;
  color: #1f332b;
}

.panel__close {
  border: none;
  background: transparent;
  min-width: 2.5rem;
  min-height: 2.5rem;
  font-size: 1.5rem;
  line-height: 1;
  color: #5a6d64;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
  margin-bottom: 0.65rem;
}

.segment button {
  border: 1px solid rgba(45, 74, 62, 0.25);
  background: transparent;
  color: #2d4a3e;
  font: inherit;
  font-size: 0.9rem;
  min-height: 2.5rem;
  border-radius: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.segment button.active {
  background: #2d4a3e;
  border-color: #2d4a3e;
  color: #f7f1e6;
}

.panel__summary {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #5a6d64;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.legend span {
  font-size: 0.72rem;
  color: #5a6d64;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  border: 1px solid transparent;
}

.legend span[data-tone="idle"],
.chart__cell[data-tone="idle"] {
  background: rgba(45, 74, 62, 0.04);
  border-color: rgba(45, 74, 62, 0.12);
}

.legend span[data-tone="learning"],
.chart__cell[data-tone="learning"] {
  background: rgba(61, 122, 94, 0.14);
  border-color: rgba(61, 122, 94, 0.28);
}

.legend span[data-tone="review"],
.chart__cell[data-tone="review"] {
  background: rgba(74, 112, 140, 0.14);
  border-color: rgba(74, 112, 140, 0.3);
}

.legend span[data-tone="weak"],
.chart__cell[data-tone="weak"] {
  background: rgba(168, 96, 64, 0.14);
  border-color: rgba(168, 96, 64, 0.3);
}

.legend span[data-tone="mature"],
.chart__cell[data-tone="mature"] {
  background: rgba(45, 74, 62, 0.2);
  border-color: rgba(45, 74, 62, 0.42);
  color: #1a2e26;
}

.chart {
  margin-bottom: 1.15rem;
}

.chart__title {
  margin: 0 0 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #5a6d64;
  letter-spacing: 0.04em;
}

.chart__grid {
  display: grid;
  gap: 0.28rem;
}

.chart__head {
  text-align: center;
  font-size: 0.68rem;
  color: #8a9a92;
  font-family: "Source Serif 4", "Noto Serif", Georgia, serif;
  padding-bottom: 0.1rem;
}

.chart__cell {
  position: relative;
  aspect-ratio: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  border: 1px solid rgba(45, 74, 62, 0.14);
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.chart__mark {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a86040;
}

.chart__cell[data-selected="true"] {
  outline: 2px solid rgba(45, 74, 62, 0.55);
  outline-offset: 1px;
}

.chart__kana {
  font-family: "Noto Serif JP", "Hiragino Mincho ProN", serif;
  font-size: clamp(0.95rem, 4.2vw, 1.25rem);
  font-weight: 600;
  color: #1a2e26;
  line-height: 1;
}

.chart__blank {
  aspect-ratio: 1;
  border-radius: 4px;
  background: transparent;
}

.detail {
  position: sticky;
  bottom: 0;
  margin-top: 0.35rem;
  padding: 0.75rem 0.7rem 0.85rem;
  border: 1px solid rgba(45, 74, 62, 0.18);
  border-radius: 8px;
  background: rgba(255, 252, 245, 0.96);
  box-shadow: 0 -8px 24px rgba(18, 28, 24, 0.06);
  backdrop-filter: blur(6px);
}

.detail__head {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}

.detail__kana {
  font-family: "Noto Serif JP", "Hiragino Mincho ProN", serif;
  font-size: 1.7rem;
  font-weight: 600;
  color: #1a2e26;
  line-height: 1;
}

.detail__romaji {
  font-family: "Source Serif 4", "Noto Serif", Georgia, serif;
  font-size: 0.92rem;
  color: #5a6d64;
}

.detail__badge {
  margin-left: auto;
  font-size: 0.7rem;
  color: #2d4a3e;
  border: 1px solid rgba(45, 74, 62, 0.25);
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
}

.detail__due {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  color: #5a6d64;
}

.detail__stats {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem 0.35rem;
}

.detail__stats div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.detail__stats dt {
  font-size: 0.68rem;
  color: #5a6d64;
}

.detail__stats dd {
  margin: 0;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  color: #1a2e26;
}

.panel__hint {
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: #8a9a92;
}

@keyframes slide {
  from {
    transform: translateX(16px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 420px) {
  .panel__sheet {
    width: 100%;
    border-left: none;
  }
}
</style>
