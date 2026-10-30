<script setup lang="ts">
import type { KanaGroup } from "@/data/gojuuon";
import type { OrderMode, PracticeSettings, ScriptMode } from "@/composables/usePractice";

const props = defineProps<{
  open: boolean;
  settings: PracticeSettings;
  remaining: number;
  total: number;
  hidden: number;
}>();

const emit = defineEmits<{
  close: [];
  update: [patch: Partial<PracticeSettings>];
  reset: [];
}>();

const groupLabels: Record<KanaGroup, string> = {
  seion: "清音",
  dakuon: "浊音",
  handakuon: "半浊音",
  youon: "拗音",
};

const allGroups: KanaGroup[] = ["seion", "dakuon", "handakuon", "youon"];

function setScriptMode(mode: ScriptMode) {
  emit("update", { scriptMode: mode });
}

function setOrderMode(mode: OrderMode) {
  emit("update", { orderMode: mode });
}

function setHideAfter(value: number) {
  const n = Number.isFinite(value) ? Math.min(20, Math.max(1, Math.round(value))) : 3;
  emit("update", { hideAfterCorrect: n });
}

function toggleGroup(group: KanaGroup) {
  const current = props.settings.enabledGroups;
  const has = current.includes(group);
  let next: KanaGroup[];
  if (has) {
    next = current.filter((g) => g !== group);
    if (next.length === 0) next = [group];
  } else {
    next = [...current, group];
  }
  emit("update", { enabledGroups: next });
}
</script>

<template>
  <div v-if="open" class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <button type="button" class="sheet__backdrop" aria-label="关闭设置" @click="$emit('close')" />
    <aside class="sheet__panel">
      <header class="sheet__header">
        <h2 id="settings-title">练习设置</h2>
        <button type="button" class="sheet__close" aria-label="关闭" @click="$emit('close')">
          ×
        </button>
      </header>

      <section class="sheet__section">
        <h3>假名种类</h3>
        <div class="segment">
          <button
            type="button"
            :class="{ active: settings.scriptMode === 'hiragana' }"
            @click="setScriptMode('hiragana')"
          >
            平假名
          </button>
          <button
            type="button"
            :class="{ active: settings.scriptMode === 'katakana' }"
            @click="setScriptMode('katakana')"
          >
            片假名
          </button>
          <button
            type="button"
            :class="{ active: settings.scriptMode === 'both' }"
            @click="setScriptMode('both')"
          >
            两者
          </button>
        </div>
      </section>

      <section class="sheet__section">
        <h3>出题顺序</h3>
        <div class="segment">
          <button
            type="button"
            :class="{ active: settings.orderMode === 'sequential' }"
            @click="setOrderMode('sequential')"
          >
            五十音序
          </button>
          <button
            type="button"
            :class="{ active: settings.orderMode === 'random' }"
            @click="setOrderMode('random')"
          >
            随机
          </button>
        </div>
      </section>

      <section class="sheet__section">
        <h3>包含范围</h3>
        <div class="chips">
          <button
            v-for="group in allGroups"
            :key="group"
            type="button"
            :class="{ active: settings.enabledGroups.includes(group) }"
            @click="toggleGroup(group)"
          >
            {{ groupLabels[group] }}
          </button>
        </div>
      </section>

      <section class="sheet__section">
        <h3>连续答对后隐藏</h3>
        <label class="number-field">
          <span>连续正确次数</span>
          <input
            type="number"
            min="1"
            max="20"
            :value="settings.hideAfterCorrect"
            @change="setHideAfter(Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <p class="sheet__meta">
          题库 {{ remaining }} / {{ total }} 可用
          <template v-if="hidden > 0">（已隐藏 {{ hidden }}）</template>
        </p>
      </section>

      <button type="button" class="sheet__reset" @click="$emit('reset')">重置进度</button>
    </aside>
  </div>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  justify-content: flex-end;
}

.sheet__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(18, 28, 24, 0.38);
  cursor: pointer;
  animation: fade 160ms ease;
}

.sheet__panel {
  position: relative;
  width: min(360px, 92vw);
  height: 100%;
  overflow: auto;
  background: #fffaf1;
  border-left: 1px solid rgba(45, 74, 62, 0.18);
  padding: 1.25rem 1.2rem 2rem;
  box-shadow: -12px 0 32px rgba(18, 28, 24, 0.12);
  animation: slide 220ms ease;
}

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.sheet__header h2 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 1.25rem;
  color: #1f332b;
}

.sheet__close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: #5a6d64;
  cursor: pointer;
}

.sheet__section {
  margin-bottom: 1.35rem;
}

.sheet__section h3 {
  margin: 0 0 0.55rem;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #5a6d64;
  text-transform: none;
}

.segment,
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.segment button,
.chips button {
  border: 1px solid rgba(45, 74, 62, 0.25);
  background: transparent;
  color: #2d4a3e;
  font: inherit;
  font-size: 0.9rem;
  padding: 0.45rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}

.segment button.active,
.chips button.active {
  background: #2d4a3e;
  border-color: #2d4a3e;
  color: #f7f1e6;
}

.number-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.92rem;
  color: #1f332b;
}

.number-field input {
  width: 4.5rem;
  border: 1px solid rgba(45, 74, 62, 0.28);
  border-radius: 4px;
  background: #fff;
  padding: 0.4rem 0.5rem;
  font: inherit;
}

.sheet__meta {
  margin: 0.55rem 0 0;
  font-size: 0.82rem;
  color: #5a6d64;
}

.sheet__reset {
  width: 100%;
  margin-top: 0.5rem;
  border: 1px solid rgba(140, 56, 48, 0.35);
  background: rgba(140, 56, 48, 0.06);
  color: #8c3830;
  font: inherit;
  font-size: 0.92rem;
  padding: 0.7rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.sheet__reset:hover {
  background: rgba(140, 56, 48, 0.12);
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
</style>
