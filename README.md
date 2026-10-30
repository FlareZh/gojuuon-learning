# 五十音帖 · gojuuon-learning

Vue 3 + Vite + TypeScript 五十音手写练习。罗马音提示，画板书写，笔画动图示范，自评后按间隔重复排程。

## 功能

1. 显示罗马音；「两者」模式下平假名 / 片假名各自单独出题
2. 提交后对照「你的写法」与「正确写法」（含笔顺动图），分别自评对错
3. **间隔重复**：答对拉长下次间隔，答错提前回来；每日有新卡上限
4. 模式：平假名 / 片假名 / 两者；界面按移动端触控优化
5. 到期卡优先；五十音序 / 随机只影响新卡与同批到期卡的排列
6. 进度以五十音图展示（未练 / 学习中 / 复习中 / 成熟 / 易错）

界面文案为简体中文；学习内容为 romaji + 假名。

## 间隔规则（阶段阶梯）

每个「假名 × 字体」独立排程（非 FSRS）：

| 阶段 | 含义   | 答对后间隔                  |
| ---- | ------ | --------------------------- |
| 0    | 新卡   | 10 分钟                     |
| 1–2  | 学习中 | 1 天 → 3 天                 |
| 3–4  | 复习中 | 7 天 → 16 天                |
| 5    | 成熟   | 30 天（见顶，仍会到期复习） |

答错：阶段回退两档，并尽快再练（本会话队尾或下次打开）。旧版「连对后隐藏」数据会迁移为对应阶段，并设为立即到期。

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

## 部署（GitHub Pages）

本仓库按 **project site** 配置 Vite `base` 为 `/gojuuon-learning/`，预期地址：

**https://flarezh.github.io/gojuuon-learning/**

### 必须由仓库管理员完成一次（否则 deploy 会 404）

Workflow 里 **build 已通过**；若 **deploy** 报 `Creating Pages deployment failed` / `HttpError: Not Found` / `Ensure GitHub Pages has been enabled`，说明 Pages 尚未启用（与 pnpm / Vite base 无关）。

1. 打开 [Settings → Pages](https://github.com/FlareZh/gojuuon-learning/settings/pages)
2. **Build and deployment → Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 回到 [Actions](https://github.com/FlareZh/gojuuon-learning/actions) → 最近一次 **Deploy GitHub Pages** → **Re-run failed jobs**  
   （或在 Actions 里对该 workflow 点 **Run workflow**）

完成后站点为：https://flarezh.github.io/gojuuon-learning/

## 笔画动图来源

Vendored under `public/strokes/` from **小楠日语** 官方打包下载（非逐文件 CDN 抓取）：

- 页面：https://riyutool.com/50yintu-bishun/
- 打包：https://down.riyutool.com/download/50yintubishun.zip
- 说明：`public/strokes/ATTRIBUTION.md`
- 映射逻辑：`src/data/strokeAssets.ts`（`fu` ← 源站 `hu`；浊音/半浊音→清音基字；拗音→基字 + 小やゆよ）

## PWA

生产构建已接入 `vite-plugin-pwa`（可安装到主屏幕、Service Worker 自动更新）。

- Manifest / 图标：`public/pwa-*.png`、`public/apple-touch-icon.png`
- `start_url` / `scope` 设为 `/gojuuon-learning/`，避免装到主屏幕后跳到站点根 `https://…github.io/`
- 笔顺 GIF：运行时 `CacheFirst`（`/gojuuon-learning/strokes/`）
- 验证：`pnpm build && pnpm preview`，用 HTTPS 或 localhost 打开后「安装应用」；部署后请在手机上删掉旧主屏幕图标再重新添加

## 技术栈

- Vue 3 + Vite + TypeScript
- vite-plugin-pwa
- oxlint / oxfmt（oxc 工具链）

## 主要路径

| 路径                               | 说明                        |
| ---------------------------------- | --------------------------- |
| `src/App.vue`                      | 练习主界面                  |
| `src/data/gojuuon.ts`              | 清音 + 浊音 / 半浊音 / 拗音 |
| `src/data/gojuuonChart.ts`         | 五十音图布局                |
| `src/data/strokeAssets.ts`         | 笔顺 GIF 路径解析           |
| `src/composables/usePractice.ts`   | 会话队列 / 出题             |
| `src/composables/srs.ts`           | 间隔重复阶段与迁移          |
| `src/composables/useStorage.ts`    | localStorage                |
| `src/components/DrawingBoard.vue`  | 手写画板                    |
| `src/components/StrokeOrder.vue`   | 正确写法中的笔顺动图        |
| `src/components/SettingsPanel.vue` | 设置面板                    |
| `src/components/ProgressPanel.vue` | 学习进度（五十音图）        |
| `public/strokes/`                  | 平假名 / 片假名笔顺动图     |
| `scripts/fetch-strokes.mjs`        | 官方 zip 一键拉取脚本       |
