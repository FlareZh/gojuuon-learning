<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { CANVAS } from "@/constants/product";
import type { ScriptKind } from "@/data/gojuuon";

const props = withDefaults(
  defineProps<{
    clearToken: number;
    script?: ScriptKind;
  }>(),
  {
    script: "hiragana",
  },
);

/** 按字体区分的田字格辅助线颜色 */
const guideStroke = computed(() =>
  props.script === "katakana" ? CANVAS.katakanaGuide : CANVAS.hiraganaGuide,
);

const frameRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;
/** 最近一次应用到位图的 CSS 像素宽高（坐标与辅助线共用） */
let cssW = 0;
let cssH = 0;
/** 每完成一笔后的位图快照（空表示仅有辅助线） */
let strokeHistory: ImageData[] = [];
const activePointers = new Set<number>();
/** 双指撤销手势进行中，直到全部触点抬起 */
let undoGestureActive = false;
/** 当前笔画是否已画出可见墨迹（忽略空点按） */
let strokeDirty = false;

/**
 * 应用笔迹样式（线宽、颜色、圆角、设备像素比变换）。
 * @returns 无
 * @副作用 修改 canvas 2D 上下文状态
 */
function applyStrokeStyle() {
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, CANVAS.maxDevicePixelRatio);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = CANVAS.lineWidthNormal;
  ctx.strokeStyle = CANVAS.inkColor;
  ctx.setLineDash([]);
}

/**
 * 按外框尺寸重设 canvas 位图；书写中途不重置以免丢笔迹。
 * @returns 无
 * @副作用 可能清空历史并重绘辅助线
 */
function sizeCanvas() {
  const frame = frameRef.value;
  const canvas = canvasRef.value;
  if (!frame || !canvas) return;
  if (drawing.value) return;

  const w = Math.round(frame.clientWidth);
  const h = Math.round(frame.clientHeight);
  if (w < CANVAS.minValidSize || h < CANVAS.minValidSize) return;

  const dpr = Math.min(window.devicePixelRatio || 1, CANVAS.maxDevicePixelRatio);
  const nextBw = Math.round(w * dpr);
  const nextBh = Math.round(h * dpr);

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

/**
 * 清空画布并绘制田字格辅助线。
 * @returns 无
 * @副作用 重绘 canvas
 */
function drawGuides() {
  if (!ctx || cssW < CANVAS.minValidSize || cssH < CANVAS.minValidSize) return;
  const w = cssW;
  const h = cssH;
  applyStrokeStyle();
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = guideStroke.value;
  ctx.lineWidth = CANVAS.guideLineWidth;
  ctx.setLineDash([...CANVAS.guideDash]);
  ctx.beginPath();
  const m = CANVAS.guideInset;
  ctx.moveTo(w / 2, m);
  ctx.lineTo(w / 2, h - m);
  ctx.moveTo(m, h / 2);
  ctx.lineTo(w - m, h / 2);
  ctx.stroke();
  ctx.restore();
  applyStrokeStyle();
}

/**
 * 截取当前完整位图。
 * @returns ImageData；失败返回 null
 * @副作用 无
 */
function captureState(): ImageData | null {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return null;
  try {
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

/**
 * 恢复到位图快照；null 则只画辅助线。
 * @param data - 历史快照
 * @returns 无
 * @副作用 重写 canvas 像素
 */
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

/**
 * 将当前画面压入笔画历史栈。
 * @returns 无
 * @副作用 向 `strokeHistory` 追加快照
 */
function pushStrokeHistory() {
  const snap = captureState();
  if (snap) strokeHistory.push(snap);
}

/**
 * 撤销上一完整笔画。
 * @returns 无
 * @副作用 弹出历史并重绘
 */
function undoLastStroke() {
  if (strokeHistory.length === 0) {
    drawGuides();
    return;
  }
  strokeHistory.pop();
  restoreState(strokeHistory[strokeHistory.length - 1] ?? null);
}

/**
 * 释放单个指针捕获。
 * @param pointerId - 指针 id
 * @returns 无
 * @副作用 调用 `releasePointerCapture`
 */
function releasePointer(pointerId: number) {
  const canvas = canvasRef.value;
  try {
    canvas?.releasePointerCapture(pointerId);
  } catch {
    // 捕获可能已解除
  }
}

/**
 * 释放当前全部活动指针。
 * @returns 无
 * @副作用 释放捕获
 */
function releaseAllPointers() {
  for (const id of [...activePointers]) releasePointer(id);
}

/**
 * 双指撤销：取消进行中的笔画，并在适当时撤销上一笔。
 * @returns 无
 * @副作用 改历史、指针集、drawing 状态
 */
function performTwoFingerUndo() {
  if (undoGestureActive) return;

  const hadInkInProgress = drawing.value && strokeDirty;
  if (drawing.value) {
    restoreState(strokeHistory[strokeHistory.length - 1] ?? null);
    drawing.value = false;
    strokeDirty = false;
  }

  undoGestureActive = true;
  releaseAllPointers();

  if (!hadInkInProgress) {
    undoLastStroke();
  }
}

/**
 * 将指针事件坐标映射到 CSS 像素画布空间。
 * @param event - 指针事件
 * @returns `{ x, y }`
 * @副作用 无
 */
function pointerPos(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas || cssW < 1) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * cssW;
  const y = ((event.clientY - rect.top) / rect.height) * cssH;
  return { x, y };
}

/**
 * 指针按下：开始笔画或触发双指撤销。
 * @param event - 指针事件
 * @returns 无
 * @副作用 捕获指针、改 drawing 状态
 */
function onPointerDown(event: PointerEvent) {
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

/**
 * 指针移动：续画当前笔画。
 * @param event - 指针事件
 * @returns 无
 * @副作用 在 canvas 上描线
 */
function onPointerMove(event: PointerEvent) {
  if (!drawing.value || !ctx || undoGestureActive) return;
  if (!activePointers.has(event.pointerId)) return;
  const { x, y } = pointerPos(event);
  strokeDirty = true;
  ctx.lineTo(x, y);
  ctx.stroke();
}

/**
 * 指针抬起 / 取消：结束笔画并可能入历史栈。
 * @param event - 指针事件
 * @returns 无
 * @副作用 更新指针集与历史
 */
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

/**
 * 触摸开始：Safari 上第二指更可靠，用于双指撤销。
 * @param event - 触摸事件
 * @returns 无
 * @副作用 可能阻止默认缩放并撤销
 */
function onTouchStart(event: TouchEvent) {
  if (event.touches.length < 2) return;
  event.preventDefault();
  performTwoFingerUndo();
}

/**
 * 清空画板与笔画历史。
 * @returns 无
 * @副作用 重置状态并重绘辅助线
 */
function clear() {
  strokeHistory = [];
  drawing.value = false;
  strokeDirty = false;
  undoGestureActive = false;
  activePointers.clear();
  drawGuides();
}

/**
 * 导出当前画面为 data URL 快照。
 * @returns PNG data URL；无 canvas 时为空串
 * @副作用 无
 */
function getSnapshot(): string {
  const canvas = canvasRef.value;
  if (!canvas) return "";
  return canvas.toDataURL(CANVAS.snapshotMime);
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
  requestAnimationFrame(() => sizeCanvas());

  const frame = frameRef.value;
  const canvas = canvasRef.value;
  if (frame && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => sizeCanvas());
    resizeObserver.observe(frame);
  }
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

defineExpose({ getSnapshot });
</script>

<template>
  <div class="board" :class="`board--${script}`">
    <div ref="frameRef" class="board__frame">
      <canvas
        ref="canvasRef"
        class="board__canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
      <button type="button" class="board__clear" @click="clear">清除</button>
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
