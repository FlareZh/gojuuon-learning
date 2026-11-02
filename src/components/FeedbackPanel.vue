<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFeedbackSubmit } from "@/composables/useFeedbackSubmit";
import {
  FEEDBACK_ISSUES_URL,
  FEEDBACK_MESSAGE_MAX,
  isFeedbackConfigured,
} from "@/constants/links";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { submitting, coolingDown, submitFeedback } = useFeedbackSubmit();

const message = ref("");
const email = ref("");
/** Honeypot — leave empty; bots often fill hidden fields */
const botcheck = ref("");
const status = ref<"idle" | "ok" | "err">("idle");
const statusText = ref("");

const configured = computed(() => isFeedbackConfigured());
const canSubmit = computed(
  () =>
    configured.value &&
    !submitting.value &&
    !coolingDown.value &&
    message.value.trim().length > 0,
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    status.value = "idle";
    statusText.value = "";
  },
);

/**
 * 提交反馈表单。
 */
async function onSubmit() {
  status.value = "idle";
  statusText.value = "";
  const result = await submitFeedback({
    message: message.value,
    email: email.value,
    botcheck: botcheck.value,
  });
  if (result.ok) {
    status.value = "ok";
    statusText.value = "已发送，感谢反馈。";
    message.value = "";
    email.value = "";
    botcheck.value = "";
    return;
  }
  status.value = "err";
  statusText.value = result.error;
}
</script>

<template>
  <div
    v-if="open"
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-labelledby="feedback-title"
  >
    <button type="button" class="sheet__backdrop" aria-label="关闭反馈" @click="emit('close')" />
    <aside class="sheet__panel">
      <header class="sheet__header">
        <h2 id="feedback-title">发送反馈</h2>
        <button type="button" class="sheet__close" aria-label="关闭" @click="emit('close')">
          ×
        </button>
      </header>

      <p class="sheet__lead">
        内容会发到维护者邮箱。缺陷与功能建议也可走
        <a :href="FEEDBACK_ISSUES_URL" target="_blank" rel="noopener noreferrer">GitHub Issues</a>。
      </p>

      <p v-if="!configured" class="sheet__banner sheet__banner--warn" role="status">
        页内反馈尚未配置 access key，请暂时使用 Issues。
      </p>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="field__label">反馈内容</span>
          <textarea
            v-model="message"
            class="field__input field__input--area"
            rows="6"
            required
            :maxlength="FEEDBACK_MESSAGE_MAX"
            :disabled="!configured || submitting"
            placeholder="请描述问题或建议（请勿填写密码等敏感信息）"
          />
          <span class="field__meta">{{ message.length }}/{{ FEEDBACK_MESSAGE_MAX }}</span>
        </label>

        <label class="field">
          <span class="field__label">回信邮箱（可选）</span>
          <input
            v-model="email"
            class="field__input"
            type="email"
            inputmode="email"
            autocomplete="email"
            :disabled="!configured || submitting"
            placeholder="方便回复时填写"
          />
        </label>

        <!-- honeypot: visually hidden, not tabindex -->
        <input
          v-model="botcheck"
          class="hp"
          type="checkbox"
          name="botcheck"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />

        <p v-if="statusText" class="sheet__banner" :class="status === 'ok' ? 'sheet__banner--ok' : 'sheet__banner--err'" role="status">
          {{ statusText }}
        </p>

        <button type="submit" class="form__submit" :disabled="!canSubmit">
          {{ submitting ? "发送中…" : coolingDown ? "请稍候…" : "发送" }}
        </button>
      </form>
    </aside>
  </div>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  z-index: 32;
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
  -webkit-tap-highlight-color: transparent;
}

.sheet__panel {
  position: relative;
  width: min(360px, 100%);
  height: 100%;
  height: 100dvh;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: #fffaf1;
  border-left: 1px solid rgba(45, 74, 62, 0.18);
  padding: 1.1rem 1rem calc(2rem + env(safe-area-inset-bottom, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
  box-shadow: -12px 0 32px rgba(18, 28, 24, 0.12);
  animation: slide 220ms ease;
}

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-top: env(safe-area-inset-top, 0px);
}

.sheet__header h2 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 1.2rem;
  color: #1f332b;
}

.sheet__close {
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

.sheet__lead {
  margin: 0 0 1rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #5a6d64;
}

.sheet__lead a {
  color: #2d4a3e;
}

.sheet__banner {
  margin: 0 0 0.85rem;
  padding: 0.55rem 0.65rem;
  border-radius: 4px;
  font-size: 0.82rem;
  line-height: 1.4;
}

.sheet__banner--ok {
  background: rgba(45, 74, 62, 0.1);
  color: #2d4a3e;
}

.sheet__banner--err,
.sheet__banner--warn {
  background: rgba(140, 56, 48, 0.08);
  color: #8c3830;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #5a6d64;
}

.field__input {
  width: 100%;
  border: 1px solid rgba(45, 74, 62, 0.28);
  border-radius: 4px;
  background: #fff;
  padding: 0.55rem 0.65rem;
  font: inherit;
  font-size: 16px;
  color: #1f332b;
  -webkit-user-select: text;
  user-select: text;
}

.field__input--area {
  resize: vertical;
  min-height: 8rem;
  line-height: 1.45;
}

.field__input:disabled {
  opacity: 0.65;
}

.field__meta {
  align-self: flex-end;
  font-size: 0.72rem;
  color: #8a9a92;
}

.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.form__submit {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid #2d4a3e;
  background: #2d4a3e;
  color: #f7f1e6;
  font: inherit;
  font-size: 0.95rem;
  min-height: 2.75rem;
  padding: 0.7rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.form__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.form__submit:hover:not(:disabled) {
  filter: brightness(1.05);
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

@media (max-width: 420px) {
  .sheet__panel {
    width: 100%;
    border-left: none;
  }
}
</style>
