import { ref, watch, type Ref } from "vue";

const PREFIX = "gojuuon-learning:";

export function useStorage<T>(key: string, defaultValue: T): Ref<T> {
  const storageKey = `${PREFIX}${key}`;
  const state = ref(readValue(storageKey, defaultValue)) as Ref<T>;

  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Quota / private mode — ignore persistence failures
      }
    },
    { deep: true },
  );

  return state;
}

function readValue<T>(storageKey: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw == null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function clearStorageKey(key: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // ignore
  }
}
