<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ScriptKind } from "@/data/gojuuon";
import { resolveStrokeAssets } from "@/data/strokeAssets";

const props = defineProps<{
  kana: string;
  romaji: string;
  entryId: string;
  script: ScriptKind;
  open: boolean;
}>();

defineEmits<{
  close: [];
}>();

const bust = ref(0);
const failed = ref(false);

const resolved = computed(() => resolveStrokeAssets(props.entryId || props.romaji, props.script));

const gifUrls = computed(() => resolved.value.urls.map((url) => `${url}?r=${bust.value}`));

watch(
  () => [props.open, props.entryId, props.script] as const,
  ([open]) => {
    if (open) {
      bust.value += 1;
      failed.value = false;
    }
  },
);

function onImgError() {
  failed.value = true;
}
</script>

<template>
  <div v-if="open" class="demo" role="dialog" aria-modal="true" aria-labelledby="stroke-demo-title">
    <div class="demo__panel">
      <header class="demo__header">
        <h2 id="stroke-demo-title">笔画示范</h2>
        <button type="button" class="demo__close" aria-label="关闭" @click="$emit('close')">
          ×
        </button>
      </header>

      <p class="demo__meta">
        <span class="demo__kana-label">{{ kana }}</span>
        <span class="demo__romaji">{{ romaji }}</span>
      </p>

      <div class="demo__stage" :class="{ 'demo__stage--split': gifUrls.length > 1 }">
        <template v-if="!failed">
          <img
            v-for="(url, index) in gifUrls"
            :key="url"
            class="demo__gif"
            :src="url"
            :alt="`${kana} 笔顺 ${index + 1}`"
            @error="onImgError"
          />
        </template>
        <div v-else class="demo__fallback">
          <span class="demo__fallback-kana">{{ kana }}</span>
          <p>笔顺动图暂不可用</p>
        </div>
      </div>

      <p v-if="resolved.note" class="demo__note">{{ resolved.note }}</p>

      <button type="button" class="demo__done" @click="$emit('close')">知道了</button>
    </div>
  </div>
</template>

<style scoped>
.demo {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(18, 28, 24, 0.45);
  backdrop-filter: blur(2px);
  animation: fade-in 180ms ease;
}

.demo__panel {
  width: min(440px, 100%);
  background: #fffaf1;
  border: 1px solid rgba(45, 74, 62, 0.2);
  border-radius: 8px;
  padding: 1.1rem 1.2rem 1.25rem;
  box-shadow: 0 18px 40px rgba(18, 28, 24, 0.18);
  animation: rise 220ms ease;
}

.demo__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.demo__header h2 {
  margin: 0;
  font-family: "Noto Serif SC", "Songti SC", serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: #1f332b;
}

.demo__close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: #5a6d64;
  cursor: pointer;
}

.demo__meta {
  margin: 0 0 0.65rem;
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  color: #5a6d64;
}

.demo__kana-label {
  font-family: "Noto Serif JP", "Hiragino Mincho ProN", serif;
  font-size: 1.55rem;
  color: #1a2e26;
  line-height: 1;
}

.demo__romaji {
  font-family: "Source Serif 4", "Noto Serif", Georgia, serif;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.demo__stage {
  display: grid;
  place-items: center;
  min-height: 240px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 50% 40%, rgba(61, 122, 94, 0.08), transparent 55%),
    linear-gradient(180deg, #f7f1e6, #efe6d6);
  border: 1px solid rgba(45, 74, 62, 0.18);
  overflow: hidden;
  padding: 0.75rem;
}

.demo__stage--split {
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.demo__gif {
  width: min(220px, 100%);
  height: auto;
  max-height: 260px;
  object-fit: contain;
  image-rendering: auto;
  background: #fff;
  border-radius: 4px;
  animation: ink-in 320ms ease;
}

.demo__fallback {
  text-align: center;
  color: #4d6258;
}

.demo__fallback-kana {
  display: block;
  font-family: "Noto Serif JP", "Hiragino Mincho ProN", serif;
  font-size: 4.5rem;
  color: rgba(31, 51, 43, 0.88);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.demo__note {
  margin: 0.65rem 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #5a6d64;
}

.demo__done {
  margin-top: 1rem;
  width: 100%;
  border: none;
  border-radius: 4px;
  background: #2d4a3e;
  color: #f7f1e6;
  font: inherit;
  font-size: 0.95rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
}

.demo__done:hover {
  background: #243c33;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ink-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
