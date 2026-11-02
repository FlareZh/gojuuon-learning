import { ref, watch, type Ref } from "vue";
import { STORAGE_PREFIX } from "@/constants/product";

/**
 * 将状态与 localStorage 双向同步的响应式引用。
 * @typeParam T - 可 JSON 序列化的状态类型
 * @param key - 逻辑键名（会自动加 {@link STORAGE_PREFIX}）
 * @param defaultValue - 无缓存或解析失败时的默认值
 * @returns 可读写的 Vue `Ref`；深度变更会写回 localStorage
 * @副作用 读取并持续写入 localStorage；配额/隐私模式失败时静默忽略
 */
export function useStorage<T>(key: string, defaultValue: T): Ref<T> {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const state = ref(readValue(storageKey, defaultValue)) as Ref<T>;

  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // 配额不足或隐私模式 — 忽略持久化失败
      }
    },
    { deep: true },
  );

  return state;
}

/**
 * 从 localStorage 读取并解析 JSON。
 * @typeParam T - 期望类型
 * @param storageKey - 完整存储键（含前缀）
 * @param defaultValue - 缺省或解析失败时返回
 * @returns 解析结果或默认值
 * @副作用 只读 localStorage
 */
function readValue<T>(storageKey: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw == null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}
