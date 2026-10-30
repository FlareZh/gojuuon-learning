<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    clearToken: number;
    label?: string;
    readonly?: boolean;
    compact?: boolean;
  }>(),
  {
    label: "",
    readonly: false,
    compact: false,
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);

let ctx: CanvasRenderingContext2D | null = null;

function sizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = props.compact ? 3.2 : 4;
  ctx.strokeStyle = "#1a2332";
  drawGuides();
}

function drawGuides() {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = "rgba(45, 74, 62, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 12);
  ctx.lineTo(w / 2, h - 12);
  ctx.moveTo(12, h / 2);
  ctx.lineTo(w - 12, h / 2);
  ctx.stroke();
  ctx.restore();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = props.compact ? 3.2 : 4;
  ctx.strokeStyle = "#1a2332";
}

function pointerPos(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function onPointerDown(event: PointerEvent) {
  if (props.readonly) return;
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return;
  canvas.setPointerCapture(event.pointerId);
  drawing.value = true;
  const { x, y } = pointerPos(event);
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function onPointerMove(event: PointerEvent) {
  if (props.readonly || !drawing.value || !ctx) return;
  const { x, y } = pointerPos(event);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function onPointerUp(event: PointerEvent) {
  drawing.value = false;
  const canvas = canvasRef.value;
  canvas?.releasePointerCapture(event.pointerId);
}

function clear() {
  drawGuides();
}

function getSnapshot(): string {
  const canvas = canvasRef.value;
  if (!canvas) return "";
  return canvas.toDataURL("image/png");
}

watch(
  () => props.clearToken,
  () => clear(),
);

onMounted(() => {
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
});

onUnmounted(() => {
  window.removeEventListener("resize", sizeCanvas);
});

defineExpose({ clear, getSnapshot });
</script>

<template>
  <div class="board" :class="{ 'board--compact': compact, 'board--readonly': readonly }">
    <p v-if="label" class="board__label">{{ label }}</p>
    <div class="board__frame">
      <canvas
        ref="canvasRef"
        class="board__canvas"
        :class="{ 'board__canvas--readonly': readonly }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
      <button v-if="!readonly" type="button" class="board__clear" @click="clear">清除</button>
    </div>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.board__label {
  margin: 0;
  font-size: 0.82rem;
  color: #5a6d64;
  letter-spacing: 0.06em;
  text-align: center;
}

.board__frame {
  position: relative;
  /* Cap by width (not max-height) so aspect-ratio stays a true square */
  width: min(100%, 48dvh, 420px);
  aspect-ratio: 1;
  margin-inline: auto;
}

.board--compact .board__frame {
  width: min(100%, 36dvh, 280px);
}

/* Stacked dual boards on phone */
@media (max-width: 639px) {
  .board--compact .board__frame {
    width: min(100%, 40dvh, 320px);
  }
}

.board__canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 4px;
  background:
    linear-gradient(180deg, rgba(255, 252, 245, 0.95), rgba(245, 238, 224, 0.98)),
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(45, 74, 62, 0.04) 24px);
  border: 1px solid rgba(45, 74, 62, 0.22);
  touch-action: none;
  cursor: crosshair;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.board__canvas--readonly {
  cursor: default;
  pointer-events: none;
}

.board__clear {
  position: absolute;
  right: 8px;
  bottom: 8px;
  border: 1px solid rgba(45, 74, 62, 0.28);
  background: rgba(255, 252, 245, 0.92);
  color: #2d4a3e;
  font: inherit;
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
}

.board__clear:hover {
  background: #fff;
}
</style>
