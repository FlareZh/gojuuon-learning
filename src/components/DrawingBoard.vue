<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

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

const frameRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;
/** CSS-pixel size last applied to the bitmap (guides / stroke coords). */
let cssW = 0;
let cssH = 0;

function sizeCanvas() {
  const frame = frameRef.value;
  const canvas = canvasRef.value;
  if (!frame || !canvas) return;
  // Don't reset the bitmap while the user is mid-stroke.
  if (drawing.value) return;

  // Use the square frame's content box — stable, excludes borders on the frame.
  const w = Math.round(frame.clientWidth);
  const h = Math.round(frame.clientHeight);
  if (w < 2 || h < 2) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const nextBw = Math.round(w * dpr);
  const nextBh = Math.round(h * dpr);

  // Skip no-op resizes so we don't wipe strokes on minor subpixel noise.
  if (canvas.width === nextBw && canvas.height === nextBh && cssW === w && cssH === h && ctx) {
    return;
  }

  cssW = w;
  cssH = h;
  canvas.width = nextBw;
  canvas.height = nextBh;
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
  if (!ctx || cssW < 2 || cssH < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = cssW;
  const h = cssH;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  ctx.setLineDash([]);
}

function pointerPos(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas || cssW < 1) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  // Map into the CSS-pixel space we used for the bitmap (handles any subpixel stretch).
  const x = ((event.clientX - rect.left) / rect.width) * cssW;
  const y = ((event.clientY - rect.top) / rect.height) * cssH;
  return { x, y };
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

onMounted(async () => {
  await nextTick();
  sizeCanvas();
  // Second pass after fonts / address-bar / dvh settle on mobile.
  requestAnimationFrame(() => sizeCanvas());

  const frame = frameRef.value;
  if (frame && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => sizeCanvas());
    resizeObserver.observe(frame);
  }
  window.addEventListener("resize", sizeCanvas);
  window.visualViewport?.addEventListener("resize", sizeCanvas);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener("resize", sizeCanvas);
  window.visualViewport?.removeEventListener("resize", sizeCanvas);
});

defineExpose({ clear, getSnapshot });
</script>

<template>
  <div class="board" :class="{ 'board--compact': compact, 'board--readonly': readonly }">
    <p v-if="label" class="board__label">{{ label }}</p>
    <div ref="frameRef" class="board__frame">
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
  /* Size from width only — avoid dvh (iOS URL bar toggles resize/wipe the canvas). */
  width: min(100%, 420px);
  aspect-ratio: 1;
  margin-inline: auto;
  border-radius: 4px;
  border: 1px solid rgba(45, 74, 62, 0.22);
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 252, 245, 0.95), rgba(245, 238, 224, 0.98)),
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(45, 74, 62, 0.04) 24px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.board--compact .board__frame {
  width: min(100%, 280px);
}

.board__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  /* Border lives on the frame so bitmap size matches the visible square */
  border: none;
  background: transparent;
  touch-action: none;
  cursor: crosshair;
}

.board__canvas--readonly {
  cursor: default;
  pointer-events: none;
}

.board__clear {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 1;
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
