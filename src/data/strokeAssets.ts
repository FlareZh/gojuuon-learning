import type { ScriptKind } from "./gojuuon";

/**
 * Stroke GIFs vendored from 小楠日语 official pack
 * https://riyutool.com/50yintu-bishun/
 * (CDN: jp-thumb.riyutool.com/50yintu-bishun/; zip download offered on page)
 *
 * Pack covers 清音 only (46 hiragana + 46 katakana). Dakuten / handakuten /
 * youon map to their base stroke GIFs.
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

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.replace(/^\//, "");
  return `${base}${normalized}`;
}

function gifPath(script: ScriptKind, id: SeionId): string {
  return withBase(`strokes/${script}/${id}.gif`);
}

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

  // Fallback: try entry id as filename
  return {
    urls: [withBase(`strokes/${script}/${entryId}.gif`)],
    kind: "exact",
    assetIds: [entryId],
    note: null,
  };
}

export function isSeionStrokeId(id: string): boolean {
  return SEION_SET.has(id);
}

/** Unique stroke GIF URLs for a practice round (both scripts if dual). */
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
 * Warm HTTP + SW caches for stroke GIFs while the user is still drawing.
 * Idempotent; safe to call on every card change.
 */
export function prefetchStrokeUrls(urls: string[]): void {
  for (const url of urls) {
    void fetch(url, { credentials: "same-origin", mode: "same-origin" }).catch(() => {
      /* ignore; img will retry on review */
    });
  }
}

/** All vendored 清音 GIF paths (~820KB total) — for idle warm-up. */
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
