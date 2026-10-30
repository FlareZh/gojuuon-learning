<script setup lang="ts">
import { ref, watch } from "vue";
import DrawingBoard from "@/components/DrawingBoard.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import StrokeDemo from "@/components/StrokeDemo.vue";
import { usePractice } from "@/composables/usePractice";

const {
  settings,
  current,
  remainingCount,
  totalCount,
  hiddenCount,
  grade,
  resetProgress,
  updateSettings,
  kanaForCurrent,
  scriptLabel,
} = usePractice();

const settingsOpen = ref(false);
const demoOpen = ref(false);
const clearToken = ref(0);

watch(current, () => {
  clearToken.value += 1;
  demoOpen.value = false;
});
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">
        <p class="brand__mark">五十音帖</p>
        <p class="brand__sub">手写练习</p>
      </div>
      <button type="button" class="icon-btn" @click="settingsOpen = true">设置</button>
    </header>

    <main class="stage">
      <template v-if="current">
        <section class="prompt" aria-live="polite">
          <p class="prompt__label">请写出对应的{{ scriptLabel }}</p>
          <p class="prompt__romaji">{{ current.entry.romaji }}</p>
        </section>

        <DrawingBoard :clear-token="clearToken" />

        <section class="actions">
          <button type="button" class="btn btn--ghost" @click="demoOpen = true">查看笔画</button>
          <div class="actions__grade">
            <button type="button" class="btn btn--ok" @click="grade(true)">正确</button>
            <button type="button" class="btn btn--bad" @click="grade(false)">错误</button>
          </div>
        </section>

        <p class="progress">
          剩余 {{ remainingCount }} / {{ totalCount }}
          <span v-if="hiddenCount > 0">· 已掌握隐藏 {{ hiddenCount }}</span>
        </p>
      </template>

      <section v-else class="empty">
        <h1>本轮练习已完成</h1>
        <p>所有选中假名都已达到连续正确次数，可重置进度或调整设置继续练习。</p>
        <div class="empty__actions">
          <button type="button" class="btn btn--ok" @click="resetProgress">重置进度</button>
          <button type="button" class="btn btn--ghost" @click="settingsOpen = true">
            打开设置
          </button>
        </div>
      </section>
    </main>

    <SettingsPanel
      :open="settingsOpen"
      :settings="settings"
      :remaining="remainingCount"
      :total="totalCount"
      :hidden="hiddenCount"
      @close="settingsOpen = false"
      @update="updateSettings"
      @reset="
        resetProgress();
        settingsOpen = false;
      "
    />

    <StrokeDemo
      :open="demoOpen"
      :kana="kanaForCurrent"
      :romaji="current?.entry.romaji ?? ''"
      :entry-id="current?.entry.id ?? ''"
      :script="current?.script ?? 'hiragana'"
      @close="demoOpen = false"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  max-width: 520px;
  margin: 0 auto;
  padding: 1rem 1.1rem 1.75rem;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.brand__mark {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.7rem, 5vw, 2.1rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #1a2e26;
  line-height: 1.15;
}

.brand__sub {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: #5a6d64;
  letter-spacing: 0.18em;
}

.icon-btn {
  border: 1px solid rgba(45, 74, 62, 0.28);
  background: rgba(255, 250, 241, 0.7);
  color: #2d4a3e;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
}

.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prompt {
  text-align: center;
  animation: settle 320ms ease;
}

.prompt__label {
  margin: 0;
  font-size: 0.9rem;
  color: #5a6d64;
}

.prompt__romaji {
  margin: 0.35rem 0 0;
  font-family: "Source Serif 4", "Noto Serif", Georgia, serif;
  font-size: clamp(2.6rem, 10vw, 3.4rem);
  font-weight: 600;
  color: #1a2e26;
  letter-spacing: 0.04em;
  line-height: 1;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.actions__grade {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.btn {
  border: none;
  border-radius: 4px;
  font: inherit;
  font-size: 0.95rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.btn--ghost {
  background: transparent;
  border: 1px solid rgba(45, 74, 62, 0.28);
  color: #2d4a3e;
}

.btn--ghost:hover {
  background: rgba(45, 74, 62, 0.06);
}

.btn--ok {
  background: #2d4a3e;
  color: #f7f1e6;
}

.btn--ok:hover {
  background: #243c33;
}

.btn--bad {
  background: rgba(140, 56, 48, 0.1);
  color: #8c3830;
  border: 1px solid rgba(140, 56, 48, 0.28);
}

.btn--bad:hover {
  background: rgba(140, 56, 48, 0.16);
}

.progress {
  margin: 0.25rem 0 0;
  text-align: center;
  font-size: 0.82rem;
  color: #5a6d64;
}

.empty {
  margin: auto 0;
  text-align: center;
  padding: 2rem 0.5rem;
  animation: settle 320ms ease;
}

.empty h1 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 1.55rem;
  color: #1a2e26;
}

.empty p {
  margin: 0.7rem auto 0;
  max-width: 28ch;
  color: #5a6d64;
  line-height: 1.55;
}

.empty__actions {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

@keyframes settle {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
