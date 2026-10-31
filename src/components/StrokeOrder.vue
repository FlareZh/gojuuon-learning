<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ScriptKind } from "@/data/gojuuon";
import { resolveStrokeAssets } from "@/data/strokeAssets";

const props = defineProps<{
  kana: string;
  entryId: string;
  script: ScriptKind;
  /** Bump to restart GIF playback (e.g. when entering review). */
  playToken?: number;
}>();

const failed = ref(false);
const remountKey = ref(0);

const resolved = computed(() => resolveStrokeAssets(props.entryId, props.script));
/** Stable URLs — do not append cache-bust query params (defeats SW / HTTP cache). */
const gifUrls = computed(() => resolved.value.urls);

watch(
  () => [props.entryId, props.script, props.playToken] as const,
  () => {
    remountKey.value += 1;
    failed.value = false;
  },
  { immediate: true },
);

function onImgError() {
  failed.value = true;
}
</script>

<template>
  <div
    class="stroke"
    :class="[
      `stroke--${script}`,
      { 'stroke--split': !failed && gifUrls.length > 1 },
    ]"
  >
    <template v-if="!failed && gifUrls.length">
      <img
        v-for="(url, index) in gifUrls"
        :key="`${remountKey}-${index}-${url}`"
        class="stroke__gif"
        :src="url"
        :alt="`${kana} 笔顺 ${index + 1}`"
        decoding="async"
        @error="onImgError"
      />
    </template>
    <div v-else class="stroke__fallback" lang="ja">{{ kana }}</div>
    <p v-if="resolved.note && !failed" class="stroke__note">{{ resolved.note }}</p>
  </div>
</template>

<style scoped>
.stroke {
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 4px;
  overflow: hidden;
  padding: 0.35rem;
}

.stroke--hiragana {
  border: 1px solid var(--board-hira-border);
  background: var(--board-hira);
}

.stroke--katakana {
  border: 1px solid var(--board-kata-border);
  background: var(--board-kata);
}

.stroke--split {
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  align-items: center;
}

.stroke__gif {
  width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  background: #fff;
  border-radius: 2px;
}

.stroke__fallback {
  font-family: "Noto Serif JP", "Hiragino Mincho ProN", serif;
  font-size: clamp(2.2rem, 12vw, 3.4rem);
  font-weight: 600;
  color: #1a2e26;
  line-height: 1;
}

.stroke__note {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 0.2rem 0.3rem;
  font-size: 0.58rem;
  line-height: 1.25;
  text-align: center;
  color: #5a6d64;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.88) 35%);
}

.stroke--split .stroke__note {
  grid-column: 1 / -1;
}
</style>
