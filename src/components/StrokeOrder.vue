<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ScriptKind } from "@/data/gojuuon";
import { resolveStrokeUrl } from "@/data/strokeAssets";

const props = defineProps<{
  kana: string;
  entryId: string;
  script: ScriptKind;
  /** 递增以强制重新挂载 GIF（进入对照阶段时） */
  playToken?: number;
}>();

const failed = ref(false);
const remountKey = ref(0);

const gifUrl = computed(() => resolveStrokeUrl(props.entryId, props.script));

watch(
  () => [props.entryId, props.script, props.playToken] as const,
  () => {
    remountKey.value += 1;
    failed.value = false;
  },
  { immediate: true },
);

/**
 * 图片加载失败时退回静态字形。
 * @returns 无
 * @副作用 将 `failed` 置为 true
 */
function onImgError() {
  failed.value = true;
}
</script>

<template>
  <div class="stroke" :class="`stroke--${script}`">
    <img
      v-if="!failed && gifUrl"
      :key="`${remountKey}-${gifUrl}`"
      class="stroke__gif"
      :src="gifUrl"
      :alt="`${kana} 笔顺`"
      decoding="async"
      @error="onImgError"
    />
    <div v-else class="stroke__fallback" lang="ja">{{ kana }}</div>
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
  container-type: size;
}

.stroke--hiragana {
  border: 1px solid var(--board-hira-border);
  background: var(--board-hira);
}

.stroke--katakana {
  border: 1px solid var(--board-kata-border);
  background: var(--board-kata);
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
  /* 字形约占格子边长的一半 */
  font-size: 50cqmin;
  font-weight: 600;
  color: #1a2e26;
  line-height: 1;
}
</style>
