export type ScriptKind = "hiragana" | "katakana";

export type KanaGroup = "seion" | "dakuon" | "handakuon" | "youon";

export interface KanaEntry {
  id: string;
  romaji: string;
  hiragana: string;
  katakana: string;
  group: KanaGroup;
  /** Gojuuon row order within the full table */
  order: number;
}

/** 清音 + 浊音 / 半浊音 / 拗音 */
export const GOJUUON: KanaEntry[] = [
  // 清音
  { id: "a", romaji: "a", hiragana: "あ", katakana: "ア", group: "seion", order: 1 },
  { id: "i", romaji: "i", hiragana: "い", katakana: "イ", group: "seion", order: 2 },
  { id: "u", romaji: "u", hiragana: "う", katakana: "ウ", group: "seion", order: 3 },
  { id: "e", romaji: "e", hiragana: "え", katakana: "エ", group: "seion", order: 4 },
  { id: "o", romaji: "o", hiragana: "お", katakana: "オ", group: "seion", order: 5 },
  { id: "ka", romaji: "ka", hiragana: "か", katakana: "カ", group: "seion", order: 6 },
  { id: "ki", romaji: "ki", hiragana: "き", katakana: "キ", group: "seion", order: 7 },
  { id: "ku", romaji: "ku", hiragana: "く", katakana: "ク", group: "seion", order: 8 },
  { id: "ke", romaji: "ke", hiragana: "け", katakana: "ケ", group: "seion", order: 9 },
  { id: "ko", romaji: "ko", hiragana: "こ", katakana: "コ", group: "seion", order: 10 },
  { id: "sa", romaji: "sa", hiragana: "さ", katakana: "サ", group: "seion", order: 11 },
  { id: "shi", romaji: "shi", hiragana: "し", katakana: "シ", group: "seion", order: 12 },
  { id: "su", romaji: "su", hiragana: "す", katakana: "ス", group: "seion", order: 13 },
  { id: "se", romaji: "se", hiragana: "せ", katakana: "セ", group: "seion", order: 14 },
  { id: "so", romaji: "so", hiragana: "そ", katakana: "ソ", group: "seion", order: 15 },
  { id: "ta", romaji: "ta", hiragana: "た", katakana: "タ", group: "seion", order: 16 },
  { id: "chi", romaji: "chi", hiragana: "ち", katakana: "チ", group: "seion", order: 17 },
  { id: "tsu", romaji: "tsu", hiragana: "つ", katakana: "ツ", group: "seion", order: 18 },
  { id: "te", romaji: "te", hiragana: "て", katakana: "テ", group: "seion", order: 19 },
  { id: "to", romaji: "to", hiragana: "と", katakana: "ト", group: "seion", order: 20 },
  { id: "na", romaji: "na", hiragana: "な", katakana: "ナ", group: "seion", order: 21 },
  { id: "ni", romaji: "ni", hiragana: "に", katakana: "ニ", group: "seion", order: 22 },
  { id: "nu", romaji: "nu", hiragana: "ぬ", katakana: "ヌ", group: "seion", order: 23 },
  { id: "ne", romaji: "ne", hiragana: "ね", katakana: "ネ", group: "seion", order: 24 },
  { id: "no", romaji: "no", hiragana: "の", katakana: "ノ", group: "seion", order: 25 },
  { id: "ha", romaji: "ha", hiragana: "は", katakana: "ハ", group: "seion", order: 26 },
  { id: "hi", romaji: "hi", hiragana: "ひ", katakana: "ヒ", group: "seion", order: 27 },
  { id: "fu", romaji: "fu", hiragana: "ふ", katakana: "フ", group: "seion", order: 28 },
  { id: "he", romaji: "he", hiragana: "へ", katakana: "ヘ", group: "seion", order: 29 },
  { id: "ho", romaji: "ho", hiragana: "ほ", katakana: "ホ", group: "seion", order: 30 },
  { id: "ma", romaji: "ma", hiragana: "ま", katakana: "マ", group: "seion", order: 31 },
  { id: "mi", romaji: "mi", hiragana: "み", katakana: "ミ", group: "seion", order: 32 },
  { id: "mu", romaji: "mu", hiragana: "む", katakana: "ム", group: "seion", order: 33 },
  { id: "me", romaji: "me", hiragana: "め", katakana: "メ", group: "seion", order: 34 },
  { id: "mo", romaji: "mo", hiragana: "も", katakana: "モ", group: "seion", order: 35 },
  { id: "ya", romaji: "ya", hiragana: "や", katakana: "ヤ", group: "seion", order: 36 },
  { id: "yu", romaji: "yu", hiragana: "ゆ", katakana: "ユ", group: "seion", order: 37 },
  { id: "yo", romaji: "yo", hiragana: "よ", katakana: "ヨ", group: "seion", order: 38 },
  { id: "ra", romaji: "ra", hiragana: "ら", katakana: "ラ", group: "seion", order: 39 },
  { id: "ri", romaji: "ri", hiragana: "り", katakana: "リ", group: "seion", order: 40 },
  { id: "ru", romaji: "ru", hiragana: "る", katakana: "ル", group: "seion", order: 41 },
  { id: "re", romaji: "re", hiragana: "れ", katakana: "レ", group: "seion", order: 42 },
  { id: "ro", romaji: "ro", hiragana: "ろ", katakana: "ロ", group: "seion", order: 43 },
  { id: "wa", romaji: "wa", hiragana: "わ", katakana: "ワ", group: "seion", order: 44 },
  { id: "wo", romaji: "wo", hiragana: "を", katakana: "ヲ", group: "seion", order: 45 },
  { id: "n", romaji: "n", hiragana: "ん", katakana: "ン", group: "seion", order: 46 },

  // 浊音
  { id: "ga", romaji: "ga", hiragana: "が", katakana: "ガ", group: "dakuon", order: 47 },
  { id: "gi", romaji: "gi", hiragana: "ぎ", katakana: "ギ", group: "dakuon", order: 48 },
  { id: "gu", romaji: "gu", hiragana: "ぐ", katakana: "グ", group: "dakuon", order: 49 },
  { id: "ge", romaji: "ge", hiragana: "げ", katakana: "ゲ", group: "dakuon", order: 50 },
  { id: "go", romaji: "go", hiragana: "ご", katakana: "ゴ", group: "dakuon", order: 51 },
  { id: "za", romaji: "za", hiragana: "ざ", katakana: "ザ", group: "dakuon", order: 52 },
  { id: "ji", romaji: "ji", hiragana: "じ", katakana: "ジ", group: "dakuon", order: 53 },
  { id: "zu", romaji: "zu", hiragana: "ず", katakana: "ズ", group: "dakuon", order: 54 },
  { id: "ze", romaji: "ze", hiragana: "ぜ", katakana: "ゼ", group: "dakuon", order: 55 },
  { id: "zo", romaji: "zo", hiragana: "ぞ", katakana: "ゾ", group: "dakuon", order: 56 },
  { id: "da", romaji: "da", hiragana: "だ", katakana: "ダ", group: "dakuon", order: 57 },
  { id: "di", romaji: "di", hiragana: "ぢ", katakana: "ヂ", group: "dakuon", order: 58 },
  { id: "du", romaji: "du", hiragana: "づ", katakana: "ヅ", group: "dakuon", order: 59 },
  { id: "de", romaji: "de", hiragana: "で", katakana: "デ", group: "dakuon", order: 60 },
  { id: "do", romaji: "do", hiragana: "ど", katakana: "ド", group: "dakuon", order: 61 },
  { id: "ba", romaji: "ba", hiragana: "ば", katakana: "バ", group: "dakuon", order: 62 },
  { id: "bi", romaji: "bi", hiragana: "び", katakana: "ビ", group: "dakuon", order: 63 },
  { id: "bu", romaji: "bu", hiragana: "ぶ", katakana: "ブ", group: "dakuon", order: 64 },
  { id: "be", romaji: "be", hiragana: "べ", katakana: "ベ", group: "dakuon", order: 65 },
  { id: "bo", romaji: "bo", hiragana: "ぼ", katakana: "ボ", group: "dakuon", order: 66 },

  // 半浊音
  { id: "pa", romaji: "pa", hiragana: "ぱ", katakana: "パ", group: "handakuon", order: 67 },
  { id: "pi", romaji: "pi", hiragana: "ぴ", katakana: "ピ", group: "handakuon", order: 68 },
  { id: "pu", romaji: "pu", hiragana: "ぷ", katakana: "プ", group: "handakuon", order: 69 },
  { id: "pe", romaji: "pe", hiragana: "ぺ", katakana: "ペ", group: "handakuon", order: 70 },
  { id: "po", romaji: "po", hiragana: "ぽ", katakana: "ポ", group: "handakuon", order: 71 },

  // 拗音
  { id: "kya", romaji: "kya", hiragana: "きゃ", katakana: "キャ", group: "youon", order: 72 },
  { id: "kyu", romaji: "kyu", hiragana: "きゅ", katakana: "キュ", group: "youon", order: 73 },
  { id: "kyo", romaji: "kyo", hiragana: "きょ", katakana: "キョ", group: "youon", order: 74 },
  { id: "sha", romaji: "sha", hiragana: "しゃ", katakana: "シャ", group: "youon", order: 75 },
  { id: "shu", romaji: "shu", hiragana: "しゅ", katakana: "シュ", group: "youon", order: 76 },
  { id: "sho", romaji: "sho", hiragana: "しょ", katakana: "ショ", group: "youon", order: 77 },
  { id: "cha", romaji: "cha", hiragana: "ちゃ", katakana: "チャ", group: "youon", order: 78 },
  { id: "chu", romaji: "chu", hiragana: "ちゅ", katakana: "チュ", group: "youon", order: 79 },
  { id: "cho", romaji: "cho", hiragana: "ちょ", katakana: "チョ", group: "youon", order: 80 },
  { id: "nya", romaji: "nya", hiragana: "にゃ", katakana: "ニャ", group: "youon", order: 81 },
  { id: "nyu", romaji: "nyu", hiragana: "にゅ", katakana: "ニュ", group: "youon", order: 82 },
  { id: "nyo", romaji: "nyo", hiragana: "にょ", katakana: "ニョ", group: "youon", order: 83 },
  { id: "hya", romaji: "hya", hiragana: "ひゃ", katakana: "ヒャ", group: "youon", order: 84 },
  { id: "hyu", romaji: "hyu", hiragana: "ひゅ", katakana: "ヒュ", group: "youon", order: 85 },
  { id: "hyo", romaji: "hyo", hiragana: "ひょ", katakana: "ヒョ", group: "youon", order: 86 },
  { id: "mya", romaji: "mya", hiragana: "みゃ", katakana: "ミャ", group: "youon", order: 87 },
  { id: "myu", romaji: "myu", hiragana: "みゅ", katakana: "ミュ", group: "youon", order: 88 },
  { id: "myo", romaji: "myo", hiragana: "みょ", katakana: "ミョ", group: "youon", order: 89 },
  { id: "rya", romaji: "rya", hiragana: "りゃ", katakana: "リャ", group: "youon", order: 90 },
  { id: "ryu", romaji: "ryu", hiragana: "りゅ", katakana: "リュ", group: "youon", order: 91 },
  { id: "ryo", romaji: "ryo", hiragana: "りょ", katakana: "リョ", group: "youon", order: 92 },
  { id: "gya", romaji: "gya", hiragana: "ぎゃ", katakana: "ギャ", group: "youon", order: 93 },
  { id: "gyu", romaji: "gyu", hiragana: "ぎゅ", katakana: "ギュ", group: "youon", order: 94 },
  { id: "gyo", romaji: "gyo", hiragana: "ぎょ", katakana: "ギョ", group: "youon", order: 95 },
  { id: "ja", romaji: "ja", hiragana: "じゃ", katakana: "ジャ", group: "youon", order: 96 },
  { id: "ju", romaji: "ju", hiragana: "じゅ", katakana: "ジュ", group: "youon", order: 97 },
  { id: "jo", romaji: "jo", hiragana: "じょ", katakana: "ジョ", group: "youon", order: 98 },
  { id: "bya", romaji: "bya", hiragana: "びゃ", katakana: "ビャ", group: "youon", order: 99 },
  { id: "byu", romaji: "byu", hiragana: "びゅ", katakana: "ビュ", group: "youon", order: 100 },
  { id: "byo", romaji: "byo", hiragana: "びょ", katakana: "ビョ", group: "youon", order: 101 },
  { id: "pya", romaji: "pya", hiragana: "ぴゃ", katakana: "ピャ", group: "youon", order: 102 },
  { id: "pyu", romaji: "pyu", hiragana: "ぴゅ", katakana: "ピュ", group: "youon", order: 103 },
  { id: "pyo", romaji: "pyo", hiragana: "ぴょ", katakana: "ピョ", group: "youon", order: 104 },
];

export function kanaGlyph(entry: KanaEntry, script: ScriptKind): string {
  return script === "hiragana" ? entry.hiragana : entry.katakana;
}
