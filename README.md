# 五十音帖 · gojuuon-learning

Vue 3 + Vite + TypeScript 五十音手写练习。罗马音提示，画板书写，笔画动图示范，自评后进入下一题。

## 功能

1. 显示罗马音，在画板手写对应平假名 / 片假名
2. 查看笔画示范（清音 GIF 动图；浊音 / 半浊音 / 拗音映射到基础假名笔顺）
3. 自评「正确 / 错误」后推进
4. 模式：平假名 / 片假名 / 两者
5. 顺序：五十音序 / 随机
6. 连续答对 N 次后从题库隐藏，直到改设置或重置

界面文案为简体中文；学习内容为 romaji + 假名。

## 开发

需要 Node.js 24（见 `.nvmrc`）。

```bash
nvm use
pnpm install
pnpm dev      # http://localhost:5173
pnpm build
pnpm lint     # oxlint
pnpm format   # oxfmt
pnpm strokes:fetch   # refresh stroke GIFs from upstream zip
```

## 笔画动图来源

Vendored under `public/strokes/` from **小楠日语** 官方打包下载（非逐文件 CDN 抓取）：

- 页面：https://riyutool.com/50yintu-bishun/
- 打包：https://down.riyutool.com/download/50yintubishun.zip
- 说明：`public/strokes/ATTRIBUTION.md`
- 映射逻辑：`src/data/strokeAssets.ts`（`fu` ← 源站 `hu`；浊音/半浊音→清音基字；拗音→基字 + 小やゆよ）

## 技术栈

- Vue 3 + Vite + TypeScript
- oxlint / oxfmt（oxc 工具链）

## 主要路径

| 路径                               | 说明                        |
| ---------------------------------- | --------------------------- |
| `src/App.vue`                      | 练习主界面                  |
| `src/data/gojuuon.ts`              | 清音 + 浊音 / 半浊音 / 拗音 |
| `src/data/strokeAssets.ts`         | 笔顺 GIF 路径解析           |
| `src/composables/usePractice.ts`   | 题库 / 连对 / 下一题        |
| `src/composables/useStorage.ts`    | localStorage                |
| `src/components/DrawingBoard.vue`  | 手写画板                    |
| `src/components/StrokeDemo.vue`    | 笔画示范（GIF）             |
| `src/components/SettingsPanel.vue` | 设置面板                    |
| `public/strokes/`                  | 平假名 / 片假名笔顺动图     |
| `scripts/fetch-strokes.mjs`        | 官方 zip 一键拉取脚本       |
