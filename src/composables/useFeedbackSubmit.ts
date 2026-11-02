import { onUnmounted, ref } from "vue";
import {
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_SUBJECT,
  FEEDBACK_SUBMIT_COOLDOWN_MS,
  WEB3FORMS_ACCESS_KEY,
  WEB3FORMS_ENDPOINT,
  isFeedbackConfigured,
} from "@/constants/links";

export interface FeedbackPayload {
  /** 反馈正文 */
  message: string;
  /** 可选回信邮箱 */
  email?: string;
  /** 蜜罐：人类应留空；有内容则视为机器人 */
  botcheck?: string;
}

export type FeedbackSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

/** 模块级上次成功提交时间，多入口共用冷却 */
let lastSuccessAt = 0;

/**
 * 向 Web3Forms 提交反馈，并在成功后进入短时冷却。
 * @returns `{ submitting, coolingDown, submitFeedback }`
 */
export function useFeedbackSubmit() {
  const submitting = ref(false);
  const coolingDown = ref(isCoolingDown());
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 根据模块级时间戳刷新冷却状态。
   */
  function syncCooldown() {
    coolingDown.value = isCoolingDown();
    if (!coolingDown.value) return;
    const remain = FEEDBACK_SUBMIT_COOLDOWN_MS - (Date.now() - lastSuccessAt);
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
   * 校验并提交反馈。
   * @param payload - 正文 / 可选邮箱 / 蜜罐
   * @returns 成功或带中文错误信息
   * @副作用 网络请求；成功时写入 lastSuccessAt
   */
  async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackSubmitResult> {
    if (!isFeedbackConfigured()) {
      return { ok: false, error: "反馈通道尚未配置，请改用 GitHub Issues。" };
    }
    if (submitting.value) {
      return { ok: false, error: "正在发送，请稍候。" };
    }
    if (isCoolingDown()) {
      syncCooldown();
      return { ok: false, error: "发送过于频繁，请稍后再试。" };
    }
    // Honeypot filled → pretend success without hitting the API.
    if (payload.botcheck?.trim()) {
      return { ok: true };
    }

    const message = payload.message.trim();
    if (!message) {
      return { ok: false, error: "请填写反馈内容。" };
    }
    if (message.length > FEEDBACK_MESSAGE_MAX) {
      return { ok: false, error: `内容过长（最多 ${FEEDBACK_MESSAGE_MAX} 字）。` };
    }

    const email = payload.email?.trim() ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "邮箱格式不正确。" };
    }

    submitting.value = true;
    try {
      const body: Record<string, string> = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: FEEDBACK_SUBJECT,
        from_name: "五十音帖",
        message,
        botcheck: "",
      };
      if (email) body.email = email;

      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!res.ok || !data?.success) {
        return {
          ok: false,
          error: data?.message?.trim() || "发送失败，请稍后重试或改用 Issues。",
        };
      }

      lastSuccessAt = Date.now();
      syncCooldown();
      return { ok: true };
    } catch {
      return { ok: false, error: "网络异常，请检查连接后重试。" };
    } finally {
      submitting.value = false;
    }
  }

  syncCooldown();

  onUnmounted(() => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  });

  return { submitting, coolingDown, submitFeedback };
}

/**
 * 是否仍在成功提交后的冷却窗口内。
 */
function isCoolingDown(): boolean {
  return Date.now() - lastSuccessAt < FEEDBACK_SUBMIT_COOLDOWN_MS;
}
