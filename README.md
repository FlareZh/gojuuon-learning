# 五十音帖 · gojuuon-learning

Vue 3 + Vite + TypeScript 五十音手写练习。罗马音提示，画板书写，笔画动图示范，自评后按间隔重复排程。界面文案为简体中文。

线上：https://flarezh.github.io/gojuuon-learning/

## 功能

1. 模式：平假名 / 片假名 / 两者（两者时各自单独出题）
2. 提交后对照「你的写法」与「正确写法」（含笔顺动图），分别自评对错
3. 间隔重复：答对拉长下次间隔，答错提前回来；每日有新卡上限
4. 到期卡优先；五十音序 / 随机只影响新卡与同批到期卡的排列
5. 进度以五十音图展示（未练 / 学习中 / 复习中 / 成熟 / 易错）
6. 可安装为 PWA（`vite-plugin-pwa`；`start_url` / `scope` 为 `/gojuuon-learning/`）

## 反馈

优先用 [GitHub Issues](https://github.com/FlareZh/gojuuon-learning/issues) 报告可复现缺陷。应用内「页内反馈」经 [Web3Forms](https://web3forms.com) 发到维护者邮箱（主题 `[五十音帖反馈]`）；请勿填写密码等敏感信息。

维护者：本地将 `.env.example` 复制为 `.env.local` 并填入 `VITE_WEB3FORMS_ACCESS_KEY`；部署时在仓库 Actions secrets 添加同名项。未配置时页内表单会提示改用 Issues。

## 间隔规则

每个「假名 × 字体」独立排程（非 FSRS）：

| 阶段 | 含义   | 答对后间隔                  |
| ---- | ------ | --------------------------- |
| 0    | 新卡   | 10 分钟                     |
| 1–2  | 学习中 | 1 天 → 3 天                 |
| 3–4  | 复习中 | 7 天 → 16 天                |
| 5    | 成熟   | 30 天（见顶，仍会到期复习） |

答错：阶段回退两档，并尽快再练（本会话队尾或下次打开）。

## 开发

需要 Node.js 24（见 `.nvmrc`；CI 同样读取）。

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build
pnpm lint     # oxlint
pnpm format   # oxfmt
pnpm strokes:fetch
```

部署：GitHub Pages Source 选 **GitHub Actions**（见 `.github/workflows/deploy-pages.yml`）。

## 笔画动图

Vendored 于 `public/strokes/`，来自 [小楠日语笔顺包](https://riyutool.com/50yintu-bishun/)（仅清音 GIF；浊/半浊/拗音显示静态字形）。映射见 `src/data/strokeAssets.ts`；出处与刷新方式见 `public/strokes/ATTRIBUTION.md`。

## 许可

[MIT License](./LICENSE)。Copyright (c) 2026 FlareZh。
