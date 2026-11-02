import { STROKE_ASSET_DIR } from "@/constants/product";
import type { ScriptKind } from "./gojuuon";

/**
 * 笔顺 GIF：来自小楠日语官方打包（https://riyutool.com/50yintu-bishun/）。
 * 源站仅有清音；浊音 / 半浊音 / 拗音无专用动图，对照时显示静态字形。
 */

/** 源站用 `hu` 表示 ふ；入库时改名为 `fu`。 */
const SEION_IDS = [
  "a",
  "i",
  "u",
  "e",
  "o",
  "ka",
  "ki",
  "ku",
  "ke",
  "ko",
  "sa",
  "shi",
  "su",
  "se",
  "so",
  "ta",
  "chi",
  "tsu",
  "te",
  "to",
  "na",
  "ni",
  "nu",
  "ne",
  "no",
  "ha",
  "hi",
  "fu",
  "he",
  "ho",
  "ma",
  "mi",
  "mu",
  "me",
  "mo",
  "ya",
  "yu",
  "yo",
  "ra",
  "ri",
  "ru",
  "re",
  "ro",
  "wa",
  "wo",
  "n",
] as const;

type SeionId = (typeof SEION_IDS)[number];

const SEION_SET = new Set<string>(SEION_IDS);

/**
 * 为相对路径加上 Vite `BASE_URL`（适配 GitHub Pages 子路径）。
 * @param path - 不以或已以 `/` 开头均可
 * @returns 绝对站点路径
 * @副作用 无
 */
function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.replace(/^\//, "");
  return `${base}${normalized}`;
}

/**
 * 拼装单个清音笔顺 GIF 路径。
 * @param script - 字体
 * @param id - 清音罗马音 id（仓库内 `fu` 对应源站 `hu`）
 * @returns 可给 `<img src>` 使用的 URL
 * @副作用 无
 */
function gifPath(script: ScriptKind, id: SeionId): string {
  return withBase(`${STROKE_ASSET_DIR}/${script}/${id}.gif`);
}

/**
 * 按假名 id 与字体解析笔顺 GIF；无动图时返回 `null`。
 * @param entryId - 五十音条目 id
 * @param script - 平 / 片
 * @returns GIF URL，或 `null`（显示静态字形）
 * @副作用 无
 */
export function resolveStrokeUrl(entryId: string, script: ScriptKind): string | null {
  if (!SEION_SET.has(entryId)) return null;
  return gifPath(script, entryId as SeionId);
}

/**
 * 预取笔顺 GIF，暖热 HTTP / Service Worker 缓存（书写阶段即可调用）。
 * @param urls - 待预取 URL（会忽略空值）
 * @returns 无
 * @副作用 发起 `fetch`；失败静默忽略
 */
export function prefetchStrokeUrls(urls: readonly (string | null | undefined)[]): void {
  for (const url of urls) {
    if (!url) continue;
    void fetch(url, { credentials: "same-origin", mode: "same-origin" }).catch(() => {
      /* 忽略；对照阶段 img 会再试 */
    });
  }
}

/**
 * 列出仓库内全部清音笔顺 GIF 路径（约 820KB），供空闲预热。
 * @returns 平假名 + 片假名全部清音 URL
 * @副作用 无
 */
export function allSeionStrokeUrls(): string[] {
  const scripts: ScriptKind[] = ["hiragana", "katakana"];
  const urls: string[] = [];
  for (const script of scripts) {
    for (const id of SEION_IDS) {
      urls.push(gifPath(script, id));
    }
  }
  return urls;
}
