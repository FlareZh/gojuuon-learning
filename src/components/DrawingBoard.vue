<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { ScriptKind } from "@/data/gojuuon";

const props = withDefaults(
  defineProps<{
    clearToken: number;
    script?: ScriptKind;
    label?: string;
    readonly?: boolean;
    compact?: boolean;
  }>(),
  {
    script: "hiragana",
    label: "",
    readonly: false,
    compact: false,
  },
);

const guideStroke = computed(() =>
  props.script === "katakana" ? "rgba(40, 96, 120, 0.22)" : "rgba(140, 96, 48, 0.22)",
);

const frameRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;
/** CSS-pixel size last applied to the bitmap (guides / stroke coords). */
let cssW = 0;
let cssH = 0;
/** Canvas bitmaps after each completed stroke (empty = guides only). */
let strokeHistory: ImageData[] = [];
const activePointers = new Set<number>();
/** True after a two-finger undo until all pointers lift. */
let undoGestureActive = false;
/** Current stroke produced visible ink (ignore empty taps). */
let strokeDirty = false;

function applyStrokeStyle() {
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = props.compact ? 3.2 : 4;
  ctx.strokeStyle = "#1a2332";
  ctx.setLineDash([]);
}

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
  strokeHistory = [];
  applyStrokeStyle();
  drawGuides();
}

function drawGuides() {
  if (!ctx || cssW < 2 || cssH < 2) return;
  const w = cssW;
  const h = cssH;
  applyStrokeStyle();
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = guideStroke.value;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 12);
  ctx.lineTo(w / 2, h - 12);
  ctx.moveTo(12, h / 2);
  ctx.lineTo(w - 12, h / 2);
  ctx.stroke();
  ctx.restore();
  applyStrokeStyle();
}

function captureState(): ImageData | null {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return null;
  try {
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

function restoreState(data: ImageData | null) {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return;
  if (!data) {
    drawGuides();
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(data, 0, 0);
  applyStrokeStyle();
}

function pushStrokeHistory() {
  const snap = captureState();
  if (snap) strokeHistory.push(snap);
}

function undoLastStroke() {
  if (strokeHistory.length === 0) {
    drawGuides();
    return;
  }
  strokeHistory.pop();
  restoreState(strokeHistory[strokeHistory.length - 1] ?? null);
}

function releasePointer(pointerId: number) {
  const canvas = canvasRef.value;
  try {
    canvas?.releasePointerCapture(pointerId);
  } catch {
    // ignore — capture may already be gone
  }
}

function releaseAllPointers() {
  for (const id of [...activePointers]) releasePointer(id);
}

/**
 * Two-finger undo. First finger often already started an empty "draw";
 * abort that, then always remove the last completed stroke once per gesture.
 */
function performTwoFingerUndo() {
  if (props.readonly || undoGestureActive) return;

  const hadInkInProgress = drawing.value && strokeDirty;
  if (drawing.value) {
    restoreState(strokeHistory[strokeHistory.length - 1] ?? null);
    drawing.value = false;
    strokeDirty = false;
  }

  undoGestureActive = true;
  releaseAllPointers();

  // Mid-stroke with ink: cancelling that stroke is enough.
  // Idle / empty first-finger tap: undo the previous completed stroke.
  if (!hadInkInProgress) {
    undoLastStroke();
  }
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

  activePointers.add(event.pointerId);

  if (activePointers.size >= 2) {
    event.preventDefault();
    performTwoFingerUndo();
    return;
  }

  if (undoGestureActive) return;

  canvas.setPointerCapture(event.pointerId);
  drawing.value = true;
  strokeDirty = false;
  const { x, y } = pointerPos(event);
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function onPointerMove(event: PointerEvent) {
  if (props.readonly || !drawing.value || !ctx || undoGestureActive) return;
  if (!activePointers.has(event.pointerId)) return;
  const { x, y } = pointerPos(event);
  strokeDirty = true;
  ctx.lineTo(x, y);
  ctx.stroke();
}

function onPointerUp(event: PointerEvent) {
  activePointers.delete(event.pointerId);
  releasePointer(event.pointerId);

  if (drawing.value && activePointers.size === 0 && !undoGestureActive) {
    drawing.value = false;
    if (strokeDirty) pushStrokeHistory();
    strokeDirty = false;
  } else if (activePointers.size === 0) {
    drawing.value = false;
    strokeDirty = false;
  }

  if (activePointers.size === 0) {
    undoGestureActive = false;
  }
}

/** iOS/Safari: pointer events for the 2nd finger are unreliable; touchstart is not. */
function onTouchStart(event: TouchEvent) {
  if (props.readonly) return;
  if (event.touches.length < 2) return;
  event.preventDefault();
  performTwoFingerUndo();
}

function clear() {
  strokeHistory = [];
  drawing.value = false;
  strokeDirty = false;
  undoGestureActive = false;
  activePointers.clear();
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

watch(
  () => props.script,
  () => {
    if (!drawing.value) clear();
  },
);

onMounted(async () => {
  await nextTick();
  sizeCanvas();
  // Second pass after fonts / address-bar / dvh settle on mobile.
  requestAnimationFrame(() => sizeCanvas());

  const frame = frameRef.value;
  const canvas = canvasRef.value;
  if (frame && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => sizeCanvas());
    resizeObserver.observe(frame);
  }
  // passive: false so we can prevent pinch-zoom and handle two-finger undo.
  canvas?.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("resize", sizeCanvas);
  window.visualViewport?.addEventListener("resize", sizeCanvas);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  canvasRef.value?.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("resize", sizeCanvas);
  window.visualViewport?.removeEventListener("resize", sizeCanvas);
});

defineExpose({ clear, getSnapshot });
</script>

<template>
  <div
    class="board"
    :class="[
      `board--${script}`,
      { 'board--compact': compact, 'board--readonly': readonly },
    ]"
  >
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
  letter-spacing: 0.06em;
  text-align: center;
}

.board--hiragana .board__label {
  color: #8a5a2b;
}

.board--katakana .board__label {
  color: #2f6a7c;
}

.board__frame {
  position: relative;
  /* Size from width only — avoid dvh (iOS URL bar toggles resize/wipe the canvas). */
  width: min(100%, 420px);
  aspect-ratio: 1;
  margin-inline: auto;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

.board--hiragana .board__frame {
  border: 1px solid var(--board-hira-border);
  background:
    linear-gradient(180deg, var(--board-hira), var(--board-hira-deep)),
    repeating-linear-gradient(0deg, transparent, transparent 23px, var(--board-hira-line) 24px);
}

.board--katakana .board__frame {
  border: 1px solid var(--board-kata-border);
  background:
    linear-gradient(180deg, var(--board-kata), var(--board-kata-deep)),
    repeating-linear-gradient(0deg, transparent, transparent 23px, var(--board-kata-line) 24px);
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
  font: inherit;
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
}

.board--hiragana .board__clear {
  border: 1px solid var(--board-hira-border);
  background: rgba(255, 246, 232, 0.92);
  color: #8a5a2b;
}

.board--katakana .board__clear {
  border: 1px solid var(--board-kata-border);
  background: rgba(232, 241, 244, 0.92);
  color: #2f6a7c;
}

.board__clear:hover {
  filter: brightness(1.04);
}
</style>
