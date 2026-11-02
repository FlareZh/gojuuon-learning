import { STROKE_ASSET_DIR } from "@/constants/product";
import type { ScriptKind } from "./gojuuon";

/**
 * 笔顺 GIF：来自小楠日语官方打包（https://riyutool.com/50yintu-bishun/）。
 * 源站仅有清音；浊音 / 半浊音 / 拗音映射到基础清音动图。
 */

/** Source pack uses `hu` for ふ; we rename to `fu` when vendoring. */
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

export type SeionId = (typeof SEION_IDS)[number];

const SEION_SET = new Set<string>(SEION_IDS);

/** Dakuten / handakuten → base seion id used for stroke animation */
const DAKUON_BASE: Record<string, SeionId> = {
  ga: "ka",
  gi: "ki",
  gu: "ku",
  ge: "ke",
  go: "ko",
  za: "sa",
  ji: "shi",
  zu: "su",
  ze: "se",
  zo: "so",
  da: "ta",
  di: "chi",
  du: "tsu",
  de: "te",
  do: "to",
  ba: "ha",
  bi: "hi",
  bu: "fu",
  be: "he",
  bo: "ho",
  pa: "ha",
  pi: "hi",
  pu: "fu",
  pe: "he",
  po: "ho",
};

/** Youon → [consonant base, small ya/yu/yo] */
const YOUON_PARTS: Record<string, [SeionId, SeionId]> = {
  kya: ["ki", "ya"],
  kyu: ["ki", "yu"],
  kyo: ["ki", "yo"],
  sha: ["shi", "ya"],
  shu: ["shi", "yu"],
  sho: ["shi", "yo"],
  cha: ["chi", "ya"],
  chu: ["chi", "yu"],
  cho: ["chi", "yo"],
  nya: ["ni", "ya"],
  nyu: ["ni", "yu"],
  nyo: ["ni", "yo"],
  hya: ["hi", "ya"],
  hyu: ["hi", "yu"],
  hyo: ["hi", "yo"],
  mya: ["mi", "ya"],
  myu: ["mi", "yu"],
  myo: ["mi", "yo"],
  rya: ["ri", "ya"],
  ryu: ["ri", "yu"],
  ryo: ["ri", "yo"],
  gya: ["ki", "ya"],
  gyu: ["ki", "yu"],
  gyo: ["ki", "yo"],
  ja: ["shi", "ya"],
  ju: ["shi", "yu"],
  jo: ["shi", "yo"],
  bya: ["hi", "ya"],
  byu: ["hi", "yu"],
  byo: ["hi", "yo"],
  pya: ["hi", "ya"],
  pyu: ["hi", "yu"],
  pyo: ["hi", "yo"],
};

export type StrokeKind = "exact" | "dakuon-base" | "handakuon-base" | "youon-parts";

export interface StrokeResolve {
  /** GIF paths under public/strokes/... (respects Vite base) */
  urls: string[];
  kind: StrokeKind;
  /** Filenames / seion ids used */
  assetIds: string[];
  note: string | null;
}

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
 * 按假名 id 与字体解析应播放的笔顺资源。
 * @param entryId - 五十音条目 id
 * @param script - 平 / 片
 * @returns URL 列表、映射类型与可选说明文案
 * @副作用 无
 */
export function resolveStrokeAssets(entryId: string, script: ScriptKind): StrokeResolve {
  if (SEION_SET.has(entryId)) {
    const id = entryId as SeionId;
    return {
      urls: [gifPath(script, id)],
      kind: "exact",
      assetIds: [id],
      note: null,
    };
  }

  const youon = YOUON_PARTS[entryId];
  if (youon) {
    const [base, small] = youon;
    const dakutenHint =
      entryId.startsWith("g") || entryId.startsWith("j") || entryId.startsWith("b")
        ? "（含浊点）"
        : entryId.startsWith("p")
          ? "（含半浊点）"
          : "";
    return {
      urls: [gifPath(script, base), gifPath(script, small)],
      kind: "youon-parts",
      assetIds: [base, small],
      note: `源站仅有清音动图；拗音${dakutenHint}拆成基础假名 + 小やゆよ笔顺`,
    };
  }

  const base = DAKUON_BASE[entryId];
  if (base) {
    const handaku = entryId.startsWith("p");
    return {
      urls: [gifPath(script, base)],
      kind: handaku ? "handakuon-base" : "dakuon-base",
      assetIds: [base],
      note: handaku
        ? "源站仅有清音动图；半浊音显示对应清音笔顺（另加半浊点゜）"
        : "源站仅有清音动图；浊音显示对应清音笔顺（另加浊点゛）",
    };
  }

  // 回退：按条目 id 当作文件名尝试
  return {
    urls: [withBase(`${STROKE_ASSET_DIR}/${script}/${entryId}.gif`)],
    kind: "exact",
    assetIds: [entryId],
    note: null,
  };
}

/**
 * 判断 id 是否为有独立 GIF 的清音。
 * @param id - 假名 id
 * @returns 是否清音资源 id
 * @副作用 无
 */
export function isSeionStrokeId(id: string): boolean {
  return SEION_SET.has(id);
}

/**
 * 汇总一轮练习所需的去重笔顺 URL（双字体时合并）。
 * @param entryId - 假名 id
 * @param scripts - 本轮字体列表
 * @returns 去重后的 GIF URL
 * @副作用 无
 */
export function strokeUrlsForRound(entryId: string, scripts: ScriptKind[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const script of scripts) {
    for (const url of resolveStrokeAssets(entryId, script).urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/**
 * 预取笔顺 GIF，暖热 HTTP / Service Worker 缓存（书写阶段即可调用）。
 * @param urls - 待预取 URL 列表
 * @returns 无
 * @副作用 发起 `fetch`；失败静默忽略
 */
export function prefetchStrokeUrls(urls: string[]): void {
  for (const url of urls) {
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
