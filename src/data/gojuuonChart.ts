/**
 * 五十音进度图布局数据：单元格为假名 id，`null` 表示空位。
 * （纯数据表，无业务魔法数。）
 */

export type ChartCellId = string | null;

/** 进度图中的一个分区（清音 / 浊音 / 半浊音 / 拗音） */
export interface ChartSection {
  id: string;
  title: string;
  columns: number;
  /** 列头（元音或拗音 ya/yu/yo） */
  headers: string[];
  rows: ChartCellId[][];
}

export const GOJUUON_CHART: ChartSection[] = [
  {
    id: "seion",
    title: "清音",
    columns: 5,
    headers: ["a", "i", "u", "e", "o"],
    rows: [
      ["a", "i", "u", "e", "o"],
      ["ka", "ki", "ku", "ke", "ko"],
      ["sa", "shi", "su", "se", "so"],
      ["ta", "chi", "tsu", "te", "to"],
      ["na", "ni", "nu", "ne", "no"],
      ["ha", "hi", "fu", "he", "ho"],
      ["ma", "mi", "mu", "me", "mo"],
      ["ya", null, "yu", null, "yo"],
      ["ra", "ri", "ru", "re", "ro"],
      ["wa", null, null, null, "wo"],
      ["n", null, null, null, null],
    ],
  },
  {
    id: "dakuon",
    title: "浊音",
    columns: 5,
    headers: ["a", "i", "u", "e", "o"],
    rows: [
      ["ga", "gi", "gu", "ge", "go"],
      ["za", "ji", "zu", "ze", "zo"],
      ["da", "di", "du", "de", "do"],
      ["ba", "bi", "bu", "be", "bo"],
    ],
  },
  {
    id: "handakuon",
    title: "半浊音",
    columns: 5,
    headers: ["a", "i", "u", "e", "o"],
    rows: [["pa", "pi", "pu", "pe", "po"]],
  },
  {
    id: "youon",
    title: "拗音",
    columns: 3,
    headers: ["ya", "yu", "yo"],
    rows: [
      ["kya", "kyu", "kyo"],
      ["sha", "shu", "sho"],
      ["cha", "chu", "cho"],
      ["nya", "nyu", "nyo"],
      ["hya", "hyu", "hyo"],
      ["mya", "myu", "myo"],
      ["rya", "ryu", "ryo"],
      ["gya", "gyu", "gyo"],
      ["ja", "ju", "jo"],
      ["bya", "byu", "byo"],
      ["pya", "pyu", "pyo"],
    ],
  },
];
