/**
 * 对外链接与反馈入口（Issues / Web3Forms）。
 * 标识符为英文；注释为简体中文。
 */

/** GitHub Issues：问题与建议反馈入口（优先用于可复现缺陷） */
export const FEEDBACK_ISSUES_URL = "https://github.com/FlareZh/gojuuon-learning/issues";

/** Web3Forms 提交地址 */
export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

/**
 * Web3Forms access key（前端可公开；相当于邮箱别名）。
 * 本地：`.env.local` 中设 `VITE_WEB3FORMS_ACCESS_KEY`；
 * 部署：GitHub Actions secret 同名注入。
 */
export const WEB3FORMS_ACCESS_KEY = String(
  import.meta.env.VITE_WEB3FORMS_ACCESS_KEY ?? "",
).trim();

/** 通知邮件主题 */
export const FEEDBACK_SUBJECT = "[五十音帖反馈]";

/** 成功提交后的冷却（毫秒），降低连点刷信 */
export const FEEDBACK_SUBMIT_COOLDOWN_MS = 30_000;

/** 正文最大长度 */
export const FEEDBACK_MESSAGE_MAX = 2000;

/**
 * 是否已配置页内反馈通道。
 * @returns access key 非空时为 true
 */
export function isFeedbackConfigured(): boolean {
  return WEB3FORMS_ACCESS_KEY.length > 0;
}
