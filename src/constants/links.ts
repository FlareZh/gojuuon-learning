/**
 * 对外链接与反馈入口（Issues / 邮件）。
 * 标识符为英文；注释为简体中文。
 */

/** GitHub Issues：问题与建议反馈入口（优先） */
export const FEEDBACK_ISSUES_URL = "https://github.com/FlareZh/gojuuon-learning/issues";

/** 邮件主题（简体中文模板） */
export const FEEDBACK_MAIL_SUBJECT = "[五十音帖反馈]";

/**
 * 邮件正文模板（简体中文）。
 * 提醒勿发密码；具体内容由用户填写。
 */
export const FEEDBACK_MAIL_BODY = `请描述你的问题或建议：



（请勿在邮件中发送密码或其他敏感信息）

---
来自：五十音帖
`;

/** 点击「邮件反馈」后的冷却时间（毫秒），降低连点骚扰 */
export const FEEDBACK_MAIL_COOLDOWN_MS = 4000;

/** 收件人用户名片段（与主机名分开存放，点击时再拼接） */
const FEEDBACK_MAIL_LOCAL = ["flare", "_", "zh"].join("");

/** 收件人主机名片段 */
const FEEDBACK_MAIL_HOST = ["outlook", ".", "com"].join("");

/**
 * 组装反馈用 `mailto:` URL（含预填主题与正文）。
 * @returns mailto 链接字符串
 * @副作用 无（不打开客户端）
 */
export function buildFeedbackMailtoUrl(): string {
  const address = `${FEEDBACK_MAIL_LOCAL}@${FEEDBACK_MAIL_HOST}`;
  const query = [
    `subject=${encodeURIComponent(FEEDBACK_MAIL_SUBJECT)}`,
    `body=${encodeURIComponent(FEEDBACK_MAIL_BODY)}`,
  ].join("&");
  return `mailto:${address}?${query}`;
}
