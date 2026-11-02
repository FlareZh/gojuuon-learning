import { onUnmounted, ref } from "vue";
import { FEEDBACK_MAIL_COOLDOWN_MS, buildFeedbackMailtoUrl } from "@/constants/links";

/** 模块级上次打开时间，设置面板与页脚共用冷却 */
let lastOpenedAt = 0;

/**
 * 打开本地邮件客户端发送反馈（`mailto:`），并做短时冷却。
 * @returns `{ coolingDown, openFeedbackMail }`
 * @副作用 可能导航到 mailto；启动冷却定时器
 */
export function useFeedbackMail() {
  const coolingDown = ref(isCoolingDown());
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 根据模块级时间戳刷新冷却状态。
   * @returns 无
   * @副作用 可能设置 timeout
   */
  function syncCooldown() {
    coolingDown.value = isCoolingDown();
    if (!coolingDown.value) return;
    const remain = FEEDBACK_MAIL_COOLDOWN_MS - (Date.now() - lastOpenedAt);
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(
      () => {
        timer = null;
        coolingDown.value = false;
      },
      Math.max(0, remain),
    );
  }

  /**
   * 尝试打开邮件反馈；冷却中则忽略。
   * @returns 是否成功发起打开
   * @副作用 写入 lastOpenedAt；赋值 `window.location.href` 为 mailto
   */
  function openFeedbackMail(): boolean {
    if (isCoolingDown()) {
      syncCooldown();
      return false;
    }
    lastOpenedAt = Date.now();
    coolingDown.value = true;
    window.location.href = buildFeedbackMailtoUrl();
    syncCooldown();
    return true;
  }

  syncCooldown();

  onUnmounted(() => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  });

  return { coolingDown, openFeedbackMail };
}

/**
 * 是否仍在冷却窗口内。
 * @returns 是否冷却中
 * @副作用 无
 */
function isCoolingDown(): boolean {
  return Date.now() - lastOpenedAt < FEEDBACK_MAIL_COOLDOWN_MS;
}
