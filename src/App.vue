<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import DrawingBoard from "@/components/DrawingBoard.vue";
import FeedbackPanel from "@/components/FeedbackPanel.vue";
import ProgressPanel from "@/components/ProgressPanel.vue";
import SettingsPanel from "@/components/SettingsPanel.vue";
import StrokeOrder from "@/components/StrokeOrder.vue";
import { usePractice } from "@/composables/usePractice";
import { AUTO_ADVANCE_AFTER_GRADE_MS, STROKE_PREFETCH } from "@/constants/product";
import { FEEDBACK_ISSUES_URL } from "@/constants/links";
import { allSeionStrokeUrls, prefetchStrokeUrls, resolveStrokeUrl } from "@/data/strokeAssets";

/** 界面阶段：书写 / 对照自评 */
type Phase = "draw" | "review";

const feedbackOpen = ref(false);

const {
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
  currentKana,
} = usePractice();

const settingsOpen = ref(false);
const progressOpen = ref(false);
const clearToken = ref(0);
const strokePlayToken = ref(0);
const phase = ref<Phase>("draw");

const boardRef = ref<InstanceType<typeof DrawingBoard> | null>(null);
const snapshot = ref("");
const graded = ref<boolean | null>(null);

let advanceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 取消「自评完成后自动下一题」定时器。
 * @returns 无
 * @副作用 清除 timeout
 */
function clearAdvanceTimer() {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

/**
 * 重置本轮 UI：回到书写阶段、清空快照与评分、强制清空画板。
 * @returns 无
 * @副作用 改 phase / snapshot / graded / clearToken；清定时器
 */
function resetRoundUi() {
  clearAdvanceTimer();
  phase.value = "draw";
  snapshot.value = "";
  graded.value = null;
  clearToken.value += 1;
}

watch(
  () => {
    const round = current.value;
    if (!round) return "";
    return `${round.entry.id}|${round.script}`;
  },
  (key, prev) => {
    // Skip UI reset on the immediate first run (same as the old non-immediate watch).
    if (prev !== undefined) resetRoundUi();
    if (!key || !current.value) return;
    prefetchStrokeUrls([resolveStrokeUrl(current.value.entry.id, current.value.script)]);
  },
  { immediate: true },
);

onMounted(() => {
  const warm = () => prefetchStrokeUrls(allSeionStrokeUrls());
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warm, { timeout: STROKE_PREFETCH.idleTimeoutMs });
  } else {
    window.setTimeout(warm, STROKE_PREFETCH.fallbackDelayMs);
  }
});

/**
 * 提交书写：截图并进入对照自评阶段。
 * @returns 无
 * @副作用 写 snapshot / graded / phase；递增笔顺播放令牌
 */
function submit() {
  clearAdvanceTimer();
  snapshot.value = boardRef.value?.getSnapshot() ?? "";
  graded.value = null;
  strokePlayToken.value += 1;
  phase.value = "review";
}

/**
 * 进入队列中的下一题并重置本轮 UI。
 * @returns Promise，在 DOM 更新后完成
 * @副作用 调用练习引擎 `nextRound` 并重置界面
 */
async function goNext() {
  nextRound();
  await nextTick();
  resetRoundUi();
}

/**
 * 处理自评按钮：记分后短暂延迟自动下一题。
 * @param correct - 是否正确
 * @returns 无
 * @副作用 写 graded、调用 gradeCurrent、启动定时器
 */
function onGrade(correct: boolean) {
  if (graded.value !== null) return;
  graded.value = correct;
  gradeCurrent(correct);

  clearAdvanceTimer();
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    void goNext();
  }, AUTO_ADVANCE_AFTER_GRADE_MS);
}

onUnmounted(clearAdvanceTimer);

/** 提示区着色用的当前字体 */
const promptScript = computed(() => current.value?.script ?? null);

/** 提示区大标题文案（平假名 / 片假名） */
const promptScriptTitle = computed(() => {
  const script = promptScript.value;
  return script ? scriptLabel(script) : "";
});
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">
        <p class="brand__mark">五十音帖</p>
        <p class="brand__sub">手写练习</p>
      </div>
      <div class="top__actions">
        <button type="button" class="icon-btn" @click="progressOpen = true">进度</button>
        <button type="button" class="icon-btn" @click="settingsOpen = true">设置</button>
      </div>
    </header>

    <main class="stage">
      <template v-if="current">
        <section
          class="prompt"
          :key="`${current.entry.id}-${current.script}`"
          :data-script="promptScript ?? undefined"
          aria-live="polite"
        >
          <p class="prompt__script">{{ promptScriptTitle }}</p>
          <p class="prompt__romaji">{{ current.entry.romaji }}</p>
          <p class="prompt__hint">在下方田字格中书写</p>
        </section>

        <!-- Draw phase -->
        <template v-if="phase === 'draw'">
          <section class="boards">
            <DrawingBoard ref="boardRef" :clear-token="clearToken" :script="current.script" />
          </section>

          <section class="actions">
            <button type="button" class="btn btn--ok btn--block" @click="submit">提交</button>
          </section>
        </template>

        <!-- Review phase -->
        <template v-else>
          <section class="reviews">
            <article class="review">
              <h2 class="review__title">{{ scriptLabel(current.script) }}</h2>
              <div class="review__compare">
                <figure class="review__pane" :data-script="current.script">
                  <figcaption>你的写法</figcaption>
                  <img v-if="snapshot" class="review__shot" :src="snapshot" alt="你的手写" />
                  <div v-else class="review__empty">未书写</div>
                </figure>
                <figure class="review__pane" :data-script="current.script">
                  <figcaption>正确写法</figcaption>
                  <StrokeOrder
                    :kana="currentKana()"
                    :entry-id="current.entry.id"
                    :script="current.script"
                    :play-token="strokePlayToken"
                  />
                </figure>
              </div>
              <div class="review__grade">
                <template v-if="graded === null">
                  <button type="button" class="btn btn--ok" @click="onGrade(true)">正确</button>
                  <button type="button" class="btn btn--bad" @click="onGrade(false)">错误</button>
                </template>
                <p v-else class="review__result" :data-ok="graded">
                  {{ graded ? "已记为正确" : "已记为错误" }}
                </p>
              </div>
            </article>
          </section>
        </template>

        <p class="progress">
          到期 {{ dueCount }} · 新卡剩余 {{ newRemainingToday }}/{{ settings.newCardsPerDay }} ·
          今日已练
          {{ reviewedToday }}
        </p>
      </template>

      <section v-else class="empty">
        <h1>暂时没有到期的练习</h1>
        <p>
          今日新卡额度已用完，或所有假名都还在间隔中。稍后再来，或在设置里提高每日新卡、调整范围。
        </p>
        <div class="empty__actions">
          <button type="button" class="btn btn--ok" @click="settingsOpen = true">打开设置</button>
          <button type="button" class="btn btn--ghost" @click="progressOpen = true">
            查看进度
          </button>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <a :href="FEEDBACK_ISSUES_URL" target="_blank" rel="noopener noreferrer">反馈 / Issues</a>
      <span class="app-footer__sep" aria-hidden="true">·</span>
      <button type="button" class="app-footer__feedback" @click="feedbackOpen = true">
        页内反馈
      </button>
    </footer>

    <FeedbackPanel :open="feedbackOpen" @close="feedbackOpen = false" />

    <SettingsPanel
      :open="settingsOpen"
      :settings="settings"
      :due-count="dueCount"
      :new-remaining-today="newRemainingToday"
      :reviewed-today="reviewedToday"
      @close="settingsOpen = false"
      @feedback="
        settingsOpen = false;
        feedbackOpen = true;
      "
      @update="updateSettings"
      @restart="
        restartFromBeginning();
        resetRoundUi();
        settingsOpen = false;
      "
      @reset="
        resetProgress();
        settingsOpen = false;
      "
    />

    <ProgressPanel :open="progressOpen" :rows="progressRows" @close="progressOpen = false" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100svh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0.75rem 0.85rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
  padding-left: max(0.85rem, env(safe-area-inset-left, 0px));
  padding-right: max(0.85rem, env(safe-area-inset-right, 0px));
  padding-top: calc(1.1rem + env(safe-area-inset-top, 0px));
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.brand__mark {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: clamp(1.45rem, 5.5vw, 2.1rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #1a2e26;
  line-height: 1.15;
}

.brand__sub {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #5a6d64;
  letter-spacing: 0.18em;
}

.top__actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.4rem;
}

.icon-btn {
  flex-shrink: 0;
  min-height: 2.5rem;
  border: 1px solid rgba(45, 74, 62, 0.28);
  background: rgba(255, 250, 241, 0.7);
  color: #2d4a3e;
  font: inherit;
  font-size: 0.88rem;
  padding: 0.45rem 0.85rem;
  border-radius: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.app-footer {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.45rem;
}

.app-footer a,
.app-footer__feedback {
  font: inherit;
  font-size: 0.78rem;
  color: #5a6d64;
  text-decoration: none;
  letter-spacing: 0.04em;
  background: none;
  border: none;
  padding: 0.2rem 0.1rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.app-footer a:hover,
.app-footer__feedback:hover {
  color: #2d4a3e;
  text-decoration: underline;
}

.app-footer__sep {
  font-size: 0.78rem;
  color: #8a9a92;
}

.prompt {
  text-align: center;
  padding: 0.85rem 1rem 0.95rem;
  border-radius: 6px;
  border: 1px solid transparent;
  animation: settle 320ms ease;
}

.prompt[data-script="hiragana"] {
  border-color: var(--board-hira-border);
  background: linear-gradient(180deg, var(--board-hira), var(--board-hira-deep));
}

.prompt[data-script="katakana"] {
  border-color: var(--board-kata-border);
  background: linear-gradient(180deg, var(--board-kata), var(--board-kata-deep));
}

.prompt__script {
  margin: 0;
  font-size: clamp(1.05rem, 4.6vw, 1.4rem);
  font-weight: 700;
  letter-spacing: 0.28em;
  line-height: 1.2;
  text-indent: 0.28em;
}

.prompt[data-script="hiragana"] .prompt__script {
  color: #8a5a2b;
}

.prompt[data-script="katakana"] .prompt__script {
  color: #2f6a7c;
}

.prompt__romaji {
  margin: 0.45rem 0 0;
  font-family: "Source Serif 4", "Noto Serif", Georgia, serif;
  font-size: clamp(2.2rem, 11vw, 3.4rem);
  font-weight: 600;
  color: #1a2e26;
  letter-spacing: 0.04em;
  line-height: 1;
}

.prompt__hint {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: #5a6d64;
}

.prompt[data-script="hiragana"] .prompt__hint {
  color: rgba(138, 90, 43, 0.78);
}

.prompt[data-script="katakana"] .prompt__hint {
  color: rgba(47, 106, 124, 0.78);
}

.boards {
  min-width: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.reviews {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.review {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.65rem 0.55rem 0.7rem;
  border: 1px solid rgba(45, 74, 62, 0.16);
  border-radius: 6px;
  background: rgba(255, 250, 241, 0.55);
  animation: settle 280ms ease;
}

.review__title {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  color: #5a6d64;
  letter-spacing: 0.06em;
  text-align: center;
}

.review__compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.review__pane {
  margin: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.review__pane figcaption {
  font-size: 0.72rem;
  color: #5a6d64;
  text-align: center;
}

.review__shot,
.review__empty {
  aspect-ratio: 1;
  border-radius: 4px;
}

.review__shot {
  width: 100%;
  object-fit: contain;
}

.review__empty {
  display: grid;
  place-items: center;
  font-size: 0.8rem;
  color: #8a9a92;
}

.review__pane[data-script="hiragana"] .review__shot,
.review__pane[data-script="hiragana"] .review__empty {
  border: 1px solid var(--board-hira-border);
  background: var(--board-hira);
}

.review__pane[data-script="katakana"] .review__shot,
.review__pane[data-script="katakana"] .review__empty {
  border: 1px solid var(--board-kata-border);
  background: var(--board-kata);
}

.review__grade {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
  min-height: 2.6rem;
  align-items: stretch;
}

.review__result {
  grid-column: 1 / -1;
  margin: 0;
  display: grid;
  place-items: center;
  font-size: 0.88rem;
  border-radius: 4px;
  background: rgba(45, 74, 62, 0.08);
  color: #2d4a3e;
}

.review__result[data-ok="false"] {
  background: rgba(140, 56, 48, 0.1);
  color: #8c3830;
}

.btn {
  border: none;
  border-radius: 4px;
  font: inherit;
  font-size: 0.95rem;
  min-height: 2.75rem;
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.btn--block {
  width: 100%;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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

.btn--ok:hover:not(:disabled) {
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
  margin: 0.1rem 0 0;
  text-align: center;
  font-size: 0.78rem;
  line-height: 1.45;
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
  font-size: 1.45rem;
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

@media (min-width: 480px) {
  .app {
    padding-left: 1.1rem;
    padding-right: 1.1rem;
  }
}
</style>
