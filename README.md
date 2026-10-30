# 五十音帖 · gojuuon-learning

Vue 3 + Vite + TypeScript 五十音手写练习。罗马音提示，画板书写，可选笔画示范占位，自评后进入下一题。

## 功能

1. 显示罗马音，在画板手写对应平假名 / 片假名
2. 查看笔画示范（v1 为字形对照占位，动画资源稍后接入）
3. 自评「正确 / 错误」后推进
4. 模式：平假名 / 片假名 / 两者
5. 顺序：五十音序 / 随机
6. 连续答对 N 次后从题库隐藏，直到改设置或重置

界面文案为简体中文；学习内容为 romaji + 假名。

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint     # oxlint
npm run format   # oxfmt
```

## 技术栈

- Vue 3 + Vite + TypeScript
- oxlint / oxfmt（oxc 工具链）

## 主要路径

| 路径                               | 说明                        |
| ---------------------------------- | --------------------------- |
| `src/App.vue`                      | 练习主界面                  |
| `src/data/gojuuon.ts`              | 清音 + 浊音 / 半浊音 / 拗音 |
| `src/composables/usePractice.ts`   | 题库 / 连对 / 下一题        |
| `src/composables/useStorage.ts`    | localStorage                |
| `src/components/DrawingBoard.vue`  | 手写画板                    |
| `src/components/StrokeDemo.vue`    | 笔画示范占位                |
| `src/components/SettingsPanel.vue` | 设置面板                    |
