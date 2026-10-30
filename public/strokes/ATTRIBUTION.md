# Stroke-order GIF attribution

Animated stroke-order GIFs under `hiragana/` and `katakana/` come from **小楠日语 (riyutool.com)**.

- Page: https://riyutool.com/50yintu-bishun/
- Official pack (used for this vendor copy): https://down.riyutool.com/download/50yintubishun.zip  
  Linked on that page as「打包下载五十音图书写笔顺动图及分解图」.
- CDN paths on the page (require Referer; not scraped individually):  
  `https://jp-thumb.riyutool.com/50yintu-bishun/{romaji}.gif`  
  `https://jp-thumb.riyutool.com/50yintu-bishun/katakana/{romaji}.gif`

## Coverage

- Pack includes **清音** only: 46 hiragana + 46 katakana GIFs.
- Source filenames use `hu.gif` for ふ/フ; vendored here as `fu.gif` to match app kana ids.
- 浊音 / 半浊音 / 拗音 have no dedicated GIFs on the source page; the app maps them to base seion stroke assets (see `src/data/strokeAssets.ts`).

## Refresh

```bash
node scripts/fetch-strokes.mjs
```

Assets are redistributed for local learning use with attribution. If the upstream license terms change or the owner requests removal, delete this folder and switch StrokeOrder to another source.
